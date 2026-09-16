import PresShell from "@/components/PresShell";

// Публичная подборка открывается в режиме презентации: без глобального меню сайта.
// Вся «обложка» (бренд, контакт, юридические ссылки) — в PresShell, она же используется
// на странице объекта, открытой из подборки.
export default function CollectionPublicLayout({ children }) {
  return <PresShell>{children}</PresShell>;
}
