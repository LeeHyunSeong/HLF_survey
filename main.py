from PIL import Image                                    #(영상 처리)
from pytesseract import *                                #설치 필요 (영상처리)https://shinminyong.tistory.com/5 참고
import re                                                #(영상처리)
import cv2                                               #설치 필요 (영상처리)https://076923.github.io/posts/Python-opencv-1/ 참고
import numpy as np                                       #설치 필요 (영상처리)https://076923.github.io/posts/Python-opencv-1/ 참고
import json                                              #(json 변환)
import pyzbar.pyzbar as pyzbar                           #설치 필요 (Qr코드 처리) https://www.opentutorials.org/module/3811/25284 참고
import matplotlib.pyplot as plt                          #(Qr코드 처리) https://www.opentutorials.org/module/3811/25284 참고
import requests                                          #(Qr코드 처리 값 해석) https://bcho.tistory.com/822 참고
import base64                                            #이미지 불러올 때를 위한 라이브러리 https://stackoverflow.com/questions/16214190/how-to-convert-base64-string-to-image/16214280 참고

class Student: #학생 클래스
    def __init__(self, data):                                         #사진과 최종 데이터 딕션너리 생성하는 생성자
        self.stu_dic = {}                                             #스캔 성공 시 json을 위한 딕션너리 생성
        self.fail_dic = {}                                            #로드 실패 시 데이터 딕션너리 생성
        self.http_dic = {}                                            #http 응답신호와 데이터를 합쳐서 보낼 딕션너리
        self.data64 = data[22:]                                       #이미지 Base64 데이터에서 앞의 형식 문자열 삭제한 문자열
        self.imgdata = base64.b64decode(self.data64)                  #이미지 변환
        self.filename = 'C:/Users/Samsung/Desktop/some_image.jpg'     #이미지 저장
        with open(self.filename, 'wb') as f:
            f.write(self.imgdata)
        self.img = cv2.imread("C:/Users/Samsung/Desktop/some_image.jpg")    #이미지 불러오기
        self.h, self.w = self.img.shape[:2]                           #이미지 높이와 너비 구하기
        self.status = 200                                             #http 응답 신호
        self.info = 'ok'                                              #http 응답 메시지
    
    def load_stu(self): #사진에서 데이터 저장 함수
        img_info = self.img[int(self.h*0.6):int(self.h*0.85), int(self.w*0.28):int(self.w*0.73)]     #이미지 정보부분 짜르기
        text = pytesseract.image_to_string(img_info, lang='kor')      #이미지 속 텍스트 저장
        info_list = re.split('\n', text)                              #텍스트 리스트로 저장
        list = []                                                     #최종 정보 저장 리스트
        for i in info_list:                                           #정보만 따로 분별해서 저장하는 작업
            if i != '' :
                list.append(i)
                
        self.stu_dic['name'] = list[0]                                #이름 추가
        self.stu_dic['depart'] = list[1]                              #학과 추가
        self.stu_dic['id'] = list[2]                                  #학번 추가
    
    def getJson(self): #json으로 변환하는 함수
        return json.dumps(self.http_dic)                               #json 파일 생성
                           
    def load_Qr(self): #Qr코드 해석 후 role 저장 함수
        gray = cv2.cvtColor(self.img, cv2.COLOR_BGR2GRAY)             #이미지 보정
        plt.imshow(gray, cmap='gray')                                 #이미지 보정
        decoded = pyzbar.decode(gray)                                 #QR코드 정보 = URL+위치 등
        Qr_data = []
        for d in decoded:                                                                       
            Qr_data.append(d.data.decode('utf-8'))                    #QR코드 값 = URL

        request = requests.get(Qr_data[0])                            #QR코드 값 해석
        qr_info = request.text                                        #QR코드 값 저장
        qr_list = re.split('"', qr_info)                              #QR코드 값 분해
        list = []                                                     #QR코드 값 분해한 것을 저장하는 리스트
        for i in qr_list:                                             #QR코드에 저장
            if i != '':
                list.append(i)
                
        if list[7] == "FAIL":                                         #읽은 값이 FAIL일때
            self.stu_dic['role'] = 'unknown'                          #학생 신분 파악 실패
            self.status = 401                                         #QR코드 읽기 실패 >> 401
            self.info = 'Failed to recognize QR code'                 #http 응답 메시지
            self.http_dic['message'] = self.info                      #빈 데이터
            self.http_dic['data'] = self.fail_dic

        elif list[7] == "SUCCES":                                    #읽은 값이 SUCCES일 때
            self.stu_dic['role'] = 'student'                         #학생 신분 파악 성공
            self.status = 200                                        #성공 >> 200
            self.info = 'Success'                                    #http 응답 메시지
            if self.stu_dic['depart'].find(" ") >= 0 :               #학생증 읽기 실패(부서에 띄어쓰기 존재)
                self.status = 400                                    #학생증 읽기 실패 >> 400
                self.info = 'Failed to recognize ID card'            #http 응답 메시지
            elif self.stu_dic['depart'].find("학과") < 0 and self.stu_dic['depart'].find("학부") < 0 : #학생증 읽기 실패(학부에 학과나 학부라는 글자가 없을 때)
                self.status = 400                                    #학생증 읽기 실패 >> 400
                self.info = 'Failed to recognize ID card'            #http 응답 메시지

            if self.stu_dic['name'].find(" ") >= 0 :                 #학생증 읽기 실패(이름에 띄어쓰기 존재)
                self.status = 400                                    #학생증 읽기 실패 >> 400
                self.info = 'Failed to recognize ID card'            #http 응답 메시지

            if self.stu_dic['id'].find(" ") >= 0 :                   #학생증 읽기 실패(학번에 띄어쓰기 존재)
                self.status = 400                                    #학생증 읽기 실패 >> 400
                self.info = 'Failed to recognize ID card'            #http 응답 메시지
            elif not self.stu_dic['id'].isdigit() :                  #학생증 읽기 실패(학번이 숫자가 아닐 경우)
                self.status = 400                                    #학생증 읽기 실패 >> 400
                self.info = 'Failed to recognize ID card'            #http 응답 메시지
            elif not int(self.stu_dic['id']) < 50000 :               #학생증 읽기 실패(학번이 50000보다 작을 경우)
                elf.status = 400                                     #학생증 읽기 실패 >> 400
                self.info = 'Failed to recognize ID card'            #http 응답 메시지
            self.http_dic['message'] = self.info                     #http 응답 메시지

            if self.status == 200:                                   #학생증 읽기 성공 >> 200
                self.http_dic['data'] = self.stu_dic                 #학생증 데이터 저장
            elif self.status == 400:                                 #학생증 읽기 실패 >> 400
                self.http_dic['data'] = self.fail_dic                #빈 데이터

    def get_Status(self): #http 응답 신호 얻는 함수
        return self.status                                           #응답 신호 리턴
