# 한국사능력검정시험 RAG 파이프라인

## 폴더 구조
```
korean_history_rag/
├── README.md
├── requirements.txt
├── data/
│   └── raw/              ← PDF 파일 여기 넣기
│       ├── 77회_한국사_문제지_심화_.pdf
│       ├── 77회_한국사_답지_심화_.pdf
│       └── ...
├── output/
│   ├── questions/        ← 회차별 파싱 결과 JSON
│   └── seed.json         ← 최종 통합 seed
├── 01_parse_exams.py     ← PDF 파싱 → JSON
├── 02_build_rag.py       ← JSON → FAISS 벡터 인덱스
└── 03_query_test.py      ← 검색 테스트
```

## 빠른 시작

```bash
# 1. 환경 세팅
pip install -r requirements.txt

# 2. PDF를 data/raw/ 폴더에 넣기
#    - 문제지: {회차}회_한국사_문제지_심화_.pdf
#    - 답지:   {회차}회_한국사_답지_심화_.pdf

# 3. 파싱 실행 (JSON seed 생성)
python 01_parse_exams.py

# 4. RAG 인덱스 빌드
python 02_build_rag.py

# 5. 검색 테스트
python 03_query_test.py
```
