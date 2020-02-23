from flask import Flask, make_response	#설치 필요 (API 라이브러리 - https://rekt77.tistory.com/103 참고)
from main import Student				#학생증 이용 .py파일

app = Flask(__name__)                                   #플라스크 객체 생성

@app.route('/stu')					#학생 객체를 만들고 정보 업로드 및 json으로 업로드 함수
def stu():
        st = Student(data)                              #학생 객체 생성(인자는 Base64 이미지 데이터)
        st.load_stu()                                   #학생 정보 로드 함수
        st.load_Qr()                                    #QR코드 로드 함수
        status = st.get_Status()                        #http 통신상태 값 받는 함수 
        stjn = st.getJson()                             #서버 통신을 위한 데이터를 json으로 받는 함수
        if status == 401:                               #QR코드 로드 값이 fail일때
                return make_response(stjn, 401)         
        elif status == 400:                             #학생증 로드를 실패했을 때
        	return make_response(stjn, 400)
        elif status == 200:                             #정상 작동
                return stjn

app.run()						#실행
