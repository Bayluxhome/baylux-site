"use client";
// <select>, который отправляет свою форму при смене значения (сортировка/фильтры без кнопки).
export default function AutoSubmitSelect(props) {
  return <select {...props} onChange={(e) => e.target.form && e.target.form.requestSubmit()} />;
}
