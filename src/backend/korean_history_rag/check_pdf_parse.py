"""
check_pdf_parse.py
──────────────────
0문항으로 파싱된 PDF의 원인 진단

실행:
    python check_pdf_parse.py
"""

import re
from pathlib import Path
import pdfplumber

RAW_DIR = Path("data/raw")


def diagnose_pdf(pdf_path: Path) -> dict:
    result = {
        "file":       pdf_path.name,
        "pages":      0,
        "text_len":   0,
        "has_text":   False,
        "q1_found":   False,
        "sample":     "",
        "issue":      "",
    }

    try:
        with pdfplumber.open(pdf_path) as pdf:
            result["pages"] = len(pdf.pages)

            # 전체 텍스트 추출
            full_text = ""
            for page in pdf.pages:
                full_text += page.extract_text() or ""

            result["text_len"] = len(full_text)
            result["has_text"] = len(full_text) > 100
            result["sample"]   = full_text[:100].replace("\n", " ")

            # "1." 패턴 찾기
            result["q1_found"] = bool(
                re.search(r"(?m)^1\.\s", full_text)
            )

            # 컬럼 분리 시도
            col_text = ""
            for page in pdf.pages:
                w, h = page.width, page.height
                left  = page.crop((0, 0, w/2, h)).extract_text() or ""
                right = page.crop((w/2, 0, w, h)).extract_text() or ""
                col_text += left + "\n" + right + "\n"

            col_q1 = bool(re.search(r"(?m)^1\.\s", col_text))

    except Exception as e:
        result["issue"] = f"파일 오류: {e}"
        return result

    # 원인 판단
    if not result["has_text"]:
        result["issue"] = "❌ 스캔 PDF (텍스트 없음) — OCR 필요"
    elif not result["q1_found"] and not col_q1:
        result["issue"] = "⚠️  텍스트는 있지만 문항 패턴 못 찾음 — 레이아웃 다름"
    elif not result["q1_found"] and col_q1:
        result["issue"] = "⚠️  컬럼 분리 후에만 패턴 발견 — 파싱 로직 수정 필요"
    else:
        result["issue"] = "✅ 정상"

    return result


def main():
    # 문제지 파일만 진단
    q_files = sorted(RAW_DIR.glob("*문제지*심화*.pdf"))
    if not q_files:
        print(f"[ERROR] {RAW_DIR}에 문제지 PDF 없음")
        return

    print(f"총 {len(q_files)}개 문제지 PDF 진단\n")
    print(f"{'파일명':<35} {'페이지':<6} {'텍스트':<8} {'원인'}")
    print("─" * 80)

    issue_counts = {"✅ 정상": 0, "❌ 스캔": 0, "⚠️  레이아웃": 0, "오류": 0}

    scan_pdfs    = []
    layout_pdfs  = []

    for pdf_path in q_files:
        r = diagnose_pdf(pdf_path)
        status = r["issue"]

        print(f"  {r['file']:<35} {r['pages']:<6} "
              f"{r['text_len']:<8} {status}")

        if "스캔" in status:
            scan_pdfs.append(r["file"])
        elif "레이아웃" in status or "컬럼" in status:
            layout_pdfs.append(r["file"])

    print("─" * 80)

    if scan_pdfs:
        print(f"\n❌ 스캔 PDF ({len(scan_pdfs)}개) — OCR 없이는 파싱 불가:")
        for f in scan_pdfs:
            print(f"  - {f}")

    if layout_pdfs:
        print(f"\n⚠️  레이아웃 문제 ({len(layout_pdfs)}개) — 파싱 로직 수정으로 해결 가능:")
        for f in layout_pdfs:
            print(f"  - {f}")

    # 샘플 텍스트 출력 (0문항 파일 중 첫 번째)
    zero_files = [f for f in q_files
                  if diagnose_pdf(f)["issue"] != "✅ 정상"]
    if zero_files:
        print(f"\n[샘플 텍스트 — {zero_files[0].name}]")
        r = diagnose_pdf(zero_files[0])
        print(f"  앞 100자: '{r['sample']}'")


if __name__ == "__main__":
    main()
