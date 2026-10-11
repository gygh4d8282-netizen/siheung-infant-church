import Link from "next/link";
export default function NotFound() {
  return (
    <div className="wrap page empty">
      <h1>페이지를 찾을 수 없어요.</h1>
      <p>주소가 바뀌었거나 더 이상 게시되지 않는 자료입니다.</p>
      <Link className="button" href="/">
        홈으로 돌아가기
      </Link>
    </div>
  );
}
