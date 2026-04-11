import json

data = json.load(open('./output/seed.json', encoding='utf-8'))

for r in data[:3]:
    qid      = r["id"]
    round_no = r["round"]
    q_num    = r["q_num"]
    stem     = r["stem"][:40]
    answer   = r["answer"]
    ans_text = r["answer_text"][:20]
    wrong    = [k for k in r["choices"] if k != r["answer"]][0]

    print(f"id:     {qid}")
    print(f"문항:   [{round_no}회 {q_num}번] {stem}")
    print(f"정답:   {answer} ({ans_text})")
    print(f"오답예: {wrong}")
    print()





