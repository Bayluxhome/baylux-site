// Словари интерфейса. ⚠️ Грузинские строки желательно вычитать носителю языка.
export const LANGS = ["ru", "en", "ka"];

export const DICT = {
  ru: {
    nav_sale: "Продажа", nav_rent: "Аренда", nav_new: "Новостройки", nav_daily: "Посуточно", nav_services: "Услуги",
    search: "Поиск", login: "Войти", cabinet: "Кабинет", sell: "Сдать / продать", favorites: "Избранное", allGeorgia: "Вся Грузия",
    hero_pre: "Недвижимость в", hero_post: "— купить, продать, снять или сдать",
    hero_sub: "Проверенные квартиры, дома и апартаменты по всей Грузии — без дублей и фейков. Прозрачные цены, честные условия и помощь местной команды на каждом шаге сделки.",
    georgia: "Грузии",
    tab_sale: "Продажа", tab_rent: "Аренда", tab_new: "Новостройки", tab_daily: "Посуточно",
    f_city: "Город", f_anyCity: "Любой город", f_type: "Тип", f_anyType: "Любой тип", f_priceTo: "Цена до, $", f_show: "Показать объекты", f_map: "На карте",
    st_verified: "проверенные объекты", st_commission: "скрытых комиссий", st_support: "поддержка", st_langs: "языка: RU · EN · GE",
  },
  en: {
    nav_sale: "Buy", nav_rent: "Rent", nav_new: "New buildings", nav_daily: "Daily", nav_services: "Services",
    search: "Search", login: "Sign in", cabinet: "Account", sell: "Sell / rent out", favorites: "Saved", allGeorgia: "All Georgia",
    hero_pre: "Real estate in", hero_post: "— buy, sell, rent or let",
    hero_sub: "Verified apartments, houses and aparthotels across Georgia — no duplicates or fakes. Transparent prices, fair terms and help from a local team at every step.",
    georgia: "Georgia",
    tab_sale: "Sale", tab_rent: "Rent", tab_new: "New builds", tab_daily: "Daily",
    f_city: "City", f_anyCity: "Any city", f_type: "Type", f_anyType: "Any type", f_priceTo: "Price up to, $", f_show: "Show objects", f_map: "On map",
    st_verified: "verified objects", st_commission: "hidden fees", st_support: "support", st_langs: "languages: RU · EN · GE",
  },
  ka: {
    nav_sale: "ყიდვა", nav_rent: "ქირა", nav_new: "ახალი კორპუსები", nav_daily: "დღიურად", nav_services: "სერვისები",
    search: "ძებნა", login: "შესვლა", cabinet: "კაბინეტი", sell: "გაყიდვა / გაქირავება", favorites: "რჩეული", allGeorgia: "მთელი საქართველო",
    hero_pre: "უძრავი ქონება —", hero_post: "ყიდვა, გაყიდვა, ქირაობა ან გაქირავება",
    hero_sub: "შემოწმებული ბინები, სახლები და აპარტამენტები მთელ საქართველოში — დუბლიკატებისა და ყალბი განცხადებების გარეშე. გამჭვირვალე ფასები და ადგილობრივი გუნდის დახმარება.",
    georgia: "საქართველო",
    tab_sale: "გაყიდვა", tab_rent: "ქირა", tab_new: "ახალი კორპუსები", tab_daily: "დღიურად",
    f_city: "ქალაქი", f_anyCity: "ნებისმიერი ქალაქი", f_type: "ტიპი", f_anyType: "ნებისმიერი ტიპი", f_priceTo: "ფასი მდე, $", f_show: "ობიექტების ჩვენება", f_map: "რუკაზე",
    st_verified: "შემოწმებული ობიექტი", st_commission: "ფარული საკომისიო", st_support: "მხარდაჭერა", st_langs: "ენა: RU · EN · GE",
  },
};

export function t(lang, key) {
  const l = DICT[lang] ? lang : "ru";
  return DICT[l][key] || DICT.ru[key] || key;
}
