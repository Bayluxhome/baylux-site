import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site">
      <div className="wrap">
        <div className="fgrid">
          <div>
            <Link className="logo" href="/"><img src="/baylux_logo_white.svg" alt="Baylux" /></Link>
            <p style={{ marginTop: 14, fontSize: 14, maxWidth: 300 }}>
              Управление, аренда и продажа недвижимости в Батуми. Скоро — другие города Грузии и мобильное приложение.
            </p>
          </div>
          <div>
            <h4>Недвижимость</h4>
            <Link href="/catalog?deal=sale">Продажа</Link>
            <Link href="/catalog?deal=rent">Аренда</Link>
            <Link href="/catalog?type=new">Новостройки</Link>
            <Link href="/catalog?deal=daily">Посуточно</Link>
          </div>
          <div>
            <h4>Услуги</h4>
            <a href="/#services">Управление недвижимостью</a><a href="/#services">Клининг</a><a href="/#services">Риелторы</a>
          </div>
          <div>
            <h4>Компания</h4>
            <Link href="/about">О компании</Link><Link href="/contacts">Контакты</Link><Link href="/terms">Условия</Link><Link href="/privacy">Конфиденциальность</Link>
          </div>
        </div>
        <div className="fbar"><span>© Baylux 2026 · Батуми, Грузия</span><span>WhatsApp · Instagram · Telegram</span></div>
      </div>
    </footer>
  );
}
