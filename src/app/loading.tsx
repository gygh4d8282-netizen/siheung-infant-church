export default function Loading() {
  return (
    <div className="wrap page empty" role="status">
      <span className="loading-flower" aria-hidden="true">
        ✳
      </span>
      <p>잠시만요, 내용을 불러오고 있어요.</p>
    </div>
  );
}
