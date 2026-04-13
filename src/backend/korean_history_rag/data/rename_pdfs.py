"""
rename_pdfs.py
──────────────
한국사 시험 PDF 파일명을 통일된 형식으로 변환

통일 형식:
    {회차}회_한국사_문제지_심화_.pdf
    {회차}회_한국사_답지_심화_.pdf

지원하는 현재 파일명 패턴:
    - 71회 한국사_문제지(심화).pdf
    - 73회 심화 문제지.pdf
    - 74회 심화 정답표.pdf
    - 76회 한국사_답지(심화)).pdf
    - 제71회 심화 정답표.pdf
    - 제72회 심화 문제지.pdf

실행:
    # 미리보기 (실제 변경 없음, 반드시 먼저 실행)
    python rename_pdfs.py --dry-run

    # 실제 변경
    python rename_pdfs.py
"""

import re
import argparse
from pathlib import Path


# ─── 설정 ────────────────────────────────────────────────────
TARGET_DIR = Path("raw")   # PDF가 있는 폴더 경로로 수정


# ─── 파일명 파싱 ──────────────────────────────────────────────
def parse_filename(filename: str) -> tuple[int, str] | None:
    """
    파일명에서 (회차번호, 파일종류) 추출
    반환: (71, "문제지") | (71, "답지") | None
    """
    name = filename.replace(".pdf", "").strip()

    # 회차 번호 추출: "제72회" 또는 "72회" 모두 처리
    round_match = re.search(r"제?(\d{2,3})회", name)
    if not round_match:
        return None
    round_no = int(round_match.group(1))

    # 종류 판별: 문제지 vs 답지(정답표)
    if any(k in name for k in ["문제지", "문제"]):
        file_type = "문제지"
    elif any(k in name for k in ["답지", "정답표", "정답지"]):
        file_type = "답지"
    else:
        return None

    return round_no, file_type


def build_new_name(round_no: int, file_type: str) -> str:
    """통일된 파일명 생성"""
    return f"{round_no}회_한국사_{file_type}_심화_.pdf"


# ─── 메인 ────────────────────────────────────────────────────
def rename_all(target_dir: Path, dry_run: bool = True):
    pdf_files = sorted(target_dir.glob("*.pdf"))

    if not pdf_files:
        print(f"[ERROR] {target_dir} 에 PDF 파일이 없습니다.")
        return

    print(f"{'[DRY RUN] ' if dry_run else ''}총 {len(pdf_files)}개 파일 처리\n")
    print(f"{'현재 파일명':<45} →  {'변경될 파일명'}")
    print("─" * 80)

    renamed   = 0
    skipped   = 0
    conflicts = []

    for pdf in pdf_files:
        result = parse_filename(pdf.name)

        if result is None:
            print(f"  [SKIP] {pdf.name:<42}  ← 패턴 인식 실패")
            skipped += 1
            continue

        round_no, file_type = result
        new_name = build_new_name(round_no, file_type)
        new_path = target_dir / new_name

        # 이미 올바른 이름인 경우
        if pdf.name == new_name:
            print(f"  [OK]   {pdf.name:<42}  (변경 불필요)")
            continue

        # 충돌 체크 (다른 파일이 이미 새 이름을 사용 중)
        if new_path.exists() and new_path != pdf:
            print(f"  [충돌] {pdf.name:<42}  →  {new_name}  ← 이미 존재!")
            conflicts.append((pdf.name, new_name))
            skipped += 1
            continue

        print(f"  [변경] {pdf.name:<42}  →  {new_name}")

        if not dry_run:
            pdf.rename(new_path)
        renamed += 1

    print("─" * 80)
    print(f"\n결과: 변경 {renamed}개 | 스킵 {skipped}개")

    if conflicts:
        print(f"\n[주의] 충돌 파일 {len(conflicts)}개 — 수동 확인 필요:")
        for old, new in conflicts:
            print(f"  {old}  →  {new}")

    if dry_run and renamed > 0:
        print("\n미리보기 완료. 실제 변경하려면:")
        print("  python rename_pdfs.py")


# ─── 실행 ────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=False,
        help="실제 변경 없이 미리보기만 출력 (기본값: False)",
    )
    parser.add_argument(
        "--dir",
        default=str(TARGET_DIR),
        help=f"PDF 폴더 경로 (기본값: {TARGET_DIR})",
    )
    args = parser.parse_args()

    rename_all(Path(args.dir), dry_run=args.dry_run)
