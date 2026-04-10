import json

data = json.load(open('output/seed.json', encoding='utf-8'))

unclassified = [r for r in data if r['era_tags'] == ['미분류']]
print(f'미분류 총 {len(unclassified)}개 / 전체 {len(data)}개')
print()

for r in unclassified[:10]:
    choices_vals = list(r["choices"].values())
    first_choice = choices_vals[0][:40] if choices_vals else "❌ 보기 없음"

    print(f'[{r["round"]}회 {r["q_num"]}번]')
    print(f'  stem:           {r["stem"][:80]}')
    print(f'  choices 수:     {len(r["choices"])}개 → {first_choice}')
    print(f'  embedding_text: {r["embedding_text"][:80]}')
    print()