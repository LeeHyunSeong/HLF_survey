'use strict';

// Fabric smart contract classes
const { Contract, Context } = require('fabric-contract-api');

// surveyNet specifc state classes
const Survey = require('./survey.js');
const SurveyInfo = require('./surveyinfo.js');
const SurveyList = require('./surveylist.js');
const Reply = require('./reply.js');
const ReplyInfo = require('./replyinfo.js');
const ReplyList = require('./replylist.js');

// surveyNet specifc private data classes
const User = require('./user.js');
const UserList = require('./userlist.js');

/**
 * A custom context provides easy access to list of all survey elements
 */
class SurveyContext extends Context {

    constructor() {
        super();
        this.surveyList = new SurveyList(this);
        this.replyList = new ReplyList(this);
        this.studentList = new UserList(this, 'studentCollection');
        this.managerList = new UserList(this, 'managerCollection');
    }

}

/**
 * Define survey smart contract by extending Fabric Contract class
 */
class SurveyContract extends Contract {

    /********************* Super class Method Override *********************/

    constructor() {
        super('org.jnu.survey');
    }

    createContext() {
        return new SurveyContext();
    }

    async beforeTransaction(ctx) {
        let txnDetails = ctx.stub.getFunctionAndParameters();
        console.info('Calling function: ' + txnDetails.fcn);
        console.info('Function arguments: ' + txnDetails.params);
    }

    async unknownTransaction(_ctx) {
        throw new Error('Unknown transaction function');
    }

    async instantiate(_ctx) {
        console.log('Instantiate the survey contract');
    }

    /********************* Survey State Change Method (User) *********************/

    async register(ctx, surveyBuffer) {
        let survey = Survey.fromBuffer(surveyBuffer);
        let surveyInfo = survey.getSurveyInfo();

        surveyInfo.setUpdatedAt(surveyInfo.getCreatedAt());
        surveyInfo.setRegistered();
        await ctx.surveyList.addSurvey(survey);
        await ctx.surveyList.setSurveyEvent('Register', surveyInfo);

        return survey;
    }

    async update(ctx, surveyBuffer) {
        let newSurvey = Survey.fromBuffer(surveyBuffer);
        let newSurveyInfo = newSurvey.getSurveyInfo();
        let surveyInfoKey = newSurveyInfo.getKey();

        let surveyInfo = await ctx.surveyList.getSurveyInfo(surveyInfoKey);
        if (!surveyInfo) {
            throw new Error('Can not found Survey = ' + surveyInfoKey);
        }
        if (surveyInfo.getManagerID() !== newSurveyInfo.getManagerID()) {
            throw new Error('Survey ' + surveyInfoKey + ' is not managed by ' + newSurveyInfo.getManagerID());
        }
        if (!surveyInfo.isRegistered()) {
            throw new Error('Survey can only be updated in REGISTERED state. Current state = ' + surveyInfo.getCurrentState());
        }

        newSurveyInfo.setUpdatedAt(Date.now());
        await ctx.surveyList.updateSurvey(newSurvey);
        await ctx.surveyList.setSurveyEvent('Update', newSurveyInfo);

        return newSurvey;
    }

    async remove(ctx, department, createdAt, managerID) {
        let surveyInfoKey = SurveyInfo.makeKey([department, createdAt]);
        let surveyInfo = await ctx.surveyList.getSurveyInfo(surveyInfoKey);
        if (!surveyInfo) {
            throw new Error('Can not found Survey = ' + surveyInfoKey);
        }
        if (surveyInfo.getManagerID() !== managerID) {
            throw new Error('Survey ' + surveyInfoKey + ' is not managed by ' + managerID);
        }
        if (surveyInfo.isRemoved()) {
            throw new Error('Survey ' + surveyInfoKey + ' already removed');
        }

        surveyInfo.setRemoved();
        await ctx.surveyList.updateSurveyInfo(surveyInfo);
        await ctx.surveyList.setSurveyEvent('Remove', surveyInfo);

        return surveyInfo;
    }

    async respond(ctx, replyBuffer) {
        let reply = Reply.fromBuffer(replyBuffer);
        let replyInfo = reply.getReplyInfo();
        let surveyKey = replyInfo.getSurveyKey();
        let surveyInfoKey = Survey.makeInfoKeyBySurveyKey(surveyKey);

        let surveyInfo = await ctx.surveyList.getSurveyInfo(surveyInfoKey);
        if (!surveyInfo) {
            throw new Error('Can not found Survey = ' + surveyInfoKey);
        }
        if (!surveyInfo.isSurveying()) {
            throw new Error('Reply can only be reponded in SURVEYING state. Current state = ' + surveyInfo.getCurrentState());
        }

        replyInfo.setUpdatedAt(replyInfo.getCreatedAt());
        await ctx.replyList.addReply(reply);

        return reply;
    }

    async revise(ctx, replyBuffer) {
        let newReply = Reply.fromBuffer(replyBuffer);
        let newReplyInfo = newReply.getReplyInfo();
        let replyInfoKey = newReplyInfo.getKey();
        let surveyKey = newReplyInfo.getSurveyKey();
        let surveyInfoKey = Survey.makeInfoKeyBySurveyKey(surveyKey);

        let surveyInfo = await ctx.surveyList.getSurveyInfo(surveyInfoKey);
        if (!surveyInfo) {
            throw new Error('Can not found Survey = ' + surveyInfoKey);
        }
        if (!surveyInfo.isSurveying()) {
            throw new Error('Reply can only be reponded in SURVEYING state. Current state = ' + surveyInfo.getCurrentState());
        }

        let replyInfo = await ctx.replyList.getReplyInfo(replyInfoKey);
        if (!replyInfo) {
            throw new Error('Can not found Reply = ' + replyInfo);
        }

        newReplyInfo.setUpdatedAt(Date.now());
        await ctx.replyList.updateReply(newReply);

        return newReply;
    }

    /********************* Survey State Change Method (WebApp) *********************/

    async start(ctx, department, createdAt) {
        let surveyInfoKey = SurveyInfo.makeKey([department, createdAt]);
        let surveyInfo = await ctx.surveyList.getSurveyInfo(surveyInfoKey);
        if (!surveyInfo) {
            throw new Error('Can not found Survey = ' + surveyInfoKey);
        }
        if (!surveyInfo.isRegistered()) {
            throw new Error('Survey can only be started in REGISTERED state. Current state = ' + surveyInfo.getCurrentState());
        }

        surveyInfo.setSurveying();
        await ctx.surveyList.updateSurveyInfo(surveyInfo);

        return surveyInfo;
    }

    async finish(ctx, department, createdAt) {
        let surveyInfoKey = SurveyInfo.makeKey([department, createdAt]);
        let surveyInfo = await ctx.surveyList.getSurveyInfo(surveyInfoKey);
        if (!surveyInfo) {
            throw new Error('Can not found Survey = ' + surveyInfoKey);
        }
        if (!surveyInfo.isSurveying()) {
            throw new Error('Survey can only be finished in SURVEYING state. Current state = ' + surveyInfo.getCurrentState());
        }

        surveyInfo.setFinished();
        await ctx.surveyList.updateSurveyInfo(surveyInfo);

        return surveyInfo;
    }

    /********************* Survey State Query Method *********************/

    async querySurvey(ctx, department, createdAt) {
        let surveyInfoKey = SurveyInfo.makeKey([department, createdAt]);
        let survey = await ctx.surveyList.getSurvey(surveyInfoKey);
        if (!survey.getServeyInfo()) {
            throw new Error('Can not found Survey = ' + surveyInfoKey);
        }
        return survey;
    }

    async querySurveyInfos(ctx, department) {
        let surveyInfos = await ctx.surveyList.getSurveyInfosByDepartment(department);
        return SurveyList.getUnremovedFromSurveyInfos(surveyInfos);
    }

    async querySurveyInfosWithPagination(ctx, department, pageSize, bookmarkCreatedAt) {
        let surveyBookmark = SurveyList.makeSurveyBookmark(department, bookmarkCreatedAt);
        let surveyInfos = await ctx.surveyList.getSurveyInfosByDepartmentWithPagination(department, pageSize, surveyBookmark);
        return SurveyList.getUnremovedFromSurveyInfos(surveyInfos);
    }

    async querySurveyInfosByRange(ctx, department, startCreatedAt, endCreatedAt) {
        let surveyInfoStart = SurveyInfo.makeKey([department, startCreatedAt]);
        let surveyInfoEnd = SurveyInfo.makeKey([department, endCreatedAt]);
        let surveyInfos = await ctx.surveyList.getSurveyInfosByRange(surveyInfoStart, surveyInfoEnd);
        return SurveyList.getUnremovedFromSurveyInfos(surveyInfos);
    }

    async querySurveyInfosByRangeWithPagination(ctx, department, startCreatedAt, endCreatedAt, pageSize, bookmarkCreatedAt) {
        let surveyInfoStart = SurveyInfo.makeKey([department, startCreatedAt]);
        let surveyInfoEnd = SurveyInfo.makeKey([department, endCreatedAt]);
        let surveyBookmark = SurveyList.makeSurveyBookmark(department, bookmarkCreatedAt);
        let surveyInfos = await ctx.surveyList.getSurveyInfosByRangeWithPagination(surveyInfoStart, surveyInfoEnd, pageSize, surveyBookmark);
        return SurveyList.getUnremovedFromSurveyInfos(surveyInfos);
    }

    async queryReply(ctx, department, surveyCreatedAt, studentID) {
        let surveyKey = Survey.makeSurveyKey(department, surveyCreatedAt);
        let replyInfoKey = ReplyInfo.makeKey([surveyKey, studentID]);
        let reply = await ctx.replyList.getReply(replyInfoKey);
        if (!reply.getReplyInfo()) {
            throw new Error('Can not found Reply = ' + replyInfoKey);
        }
        return reply;
    }

    async queryReplies(ctx, department, surveyCreatedAt) {
        let surveyKey = Survey.makeSurveyKey(department, surveyCreatedAt);
        return await ctx.replyList.getRepliesBySurveyKey(surveyKey);
    }

    async queryRepliesByRange(ctx, department, surveyCreatedAt, startStudentID, endStudentID) {
        let surveyKey = Survey.makeSurveyKey(department, surveyCreatedAt);
        let replyInfoStart = ReplyInfo.makeKey([surveyKey, startStudentID]);
        let replyInfoEnd = ReplyInfo.makeKey([surveyKey, endStudentID]);
        return await ctx.replyList.getRepliesByRange(replyInfoStart, replyInfoEnd);
    }

    async queryRepliesByRangeWithPagination(ctx, department, surveyCreatedAt, startStudentID, endStudentID, pageSize, bookmarkStudentID) {
        let surveyKey = Survey.makeSurveyKey(department, surveyCreatedAt);
        let replyInfoStart = ReplyInfo.makeKey([surveyKey, startStudentID]);
        let replyInfoEnd = ReplyInfo.makeKey([surveyKey, endStudentID]);
        let replyBookmark = ReplyList.makeReplyBookmark(surveyKey, bookmarkStudentID);
        return await ctx.replyList.getRepliesByRangeWithPagination(replyInfoStart, replyInfoEnd, pageSize, replyBookmark);
    }

    /********************* Survey User Method (User) *********************/

    async registerStudent(ctx, id, password, name, departmentsJSON) {
        let userKey = User.makeKey([id]);
        let userExists = await ctx.studentList.getUser(userKey);
        if (userExists) {
            throw new Error('User ' + userKey + ' already exists');
        }

        let salt = User.makeSalt();
        let hashedPw = User.encryptPassword(password, salt);
        let departments = JSON.parse(departmentsJSON);
        let user = User.createInstance(id, hashedPw, name, departments, salt, Date.now());
        user.setUpdatedAt(user.getCreatedAt());

        await ctx.studentList.addUser(user);
        return user;
    }

    async registerManager(ctx, id, password, departmentsJSON) {
        let userKey = User.makeKey([id]);
        let userExists = await ctx.managerList.getUser(userKey);
        if (userExists) {
            throw new Error('User ' + userKey + ' already exists');
        }

        let salt = User.makeSalt();
        let hashedPw = User.encryptPassword(password, salt);
        let departments = JSON.parse(departmentsJSON);
        let user = User.createInstance(id, hashedPw, 'manager', departments, salt, Date.now());
        user.setUpdatedAt(user.getCreatedAt());

        await ctx.managerList.addUser(user);
        return user;
    }

    async updateStudent(ctx, id, password, name, departmentsJSON) {
        let userKey = User.makeKey([id]);
        let user = await ctx.studentList.getUser(userKey);
        if (!user) {
            throw new Error('Can not found User = ' + userKey);
        }

        let salt = user.getSalt();
        let hashedPw = User.encryptPassword(password, salt);
        let departments = JSON.parse(departmentsJSON);
        user.setHashedPw(hashedPw);
        user.setName(name);
        user.setDepartments(departments);
        user.setUpdatedAt(Date.now());

        await ctx.studentList.updateUser(user);
        return user;
    }

    async updateManager(ctx, id, password, departmentsJSON) {
        let userKey = User.makeKey([id]);
        let user = await ctx.managerList.getUser(userKey);
        if (!user) {
            throw new Error('Can not found User = ' + userKey);
        }

        let salt = user.getSalt();
        let hashedPw = User.encryptPassword(password, salt);
        let departments = JSON.parse(departmentsJSON);
        user.setHashedPw(hashedPw);
        user.setDepartments(departments);
        user.setUpdatedAt(Date.now());

        await ctx.managerList.updateUser(user);
        return user;
    }

    async deleteStudent(ctx, id, password) {
        let userKey = User.makeKey([id]);
        let user = await ctx.studentList.getUser(userKey);
        if (!user) {
            throw new Error('Can not found User = ' + userKey);
        }
        if (!user.authenticate(password)) {
            throw new Error('user ' + userKey + ' password is not matched');
        }

        await ctx.studentList.deleteUser(userKey);
        return user;
    }

    async deleteManager(ctx, id, password) {
        let userKey = User.makeKey([id]);
        let user = await ctx.managerList.getUser(userKey);
        if (!user) {
            throw new Error('Can not found User = ' + userKey);
        }
        if (!user.authenticate(password)) {
            throw new Error('user ' + userKey + ' password is not matched');
        }

        await ctx.managerList.deleteUser(userKey);
        return user;
    }

    /********************* Survey User Query Method *********************/

    async queryStudent(ctx, id) {
        let userKey = User.makeKey([id]);
        let user = await ctx.studentList.getUser(userKey);
        if (!user) {
            throw new Error('Can not found User = ' + userKey);
        }

        return user;
    }

    async queryManager(ctx, id) {
        let userKey = User.makeKey([id]);
        let user = await ctx.managerList.getUser(userKey);
        if (!user) {
            throw new Error('Can not found User = ' + userKey);
        }

        return user;
    }

    async certifyStudent(ctx, id, password) {
        let userKey = User.makeKey([id]);
        let user = await ctx.studentList.getUser(userKey);
        if (!user) {
            throw new Error('Can not found User = ' + userKey);
        }
        if (!user.authenticate(password)) {
            throw new Error('user ' + userKey + ' password is not matched');
        }

        return user;
    }

    async certifyManager(ctx, id, password) {
        let userKey = User.makeKey([id]);
        let user = await ctx.managerList.getUser(userKey);
        if (!user) {
            throw new Error('Can not found User = ' + userKey);
        }
        if (!user.authenticate(password)) {
            throw new Error('user ' + userKey + ' password is not matched');
        }

        return user;
    }

}

module.exports = SurveyContract;
