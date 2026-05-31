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
    // каталог
    cat_found: "Найдено", cat_objects: "объект(ов)", chip_all: "Все", f_rooms: "Комнат", f_anyRooms: "Любая", f_studio: "Студия",
    f_yearFrom: "Год от", f_priceFrom: "Цена от, $", f_areaFrom: "Площадь от, м²", f_areaTo: "Площадь до, м²", f_reset: "Сбросить", f_noCommission: "Без комиссии", cat_empty: "По этому фильтру пока нет объектов.",
    // футер
    foot_about: "Управление, аренда и продажа недвижимости в Грузии. Скоро — новые города и мобильное приложение.",
    foot_realty: "Недвижимость", foot_company: "Компания", foot_mgmt: "Управление недвижимостью", foot_cleaning: "Клининг", foot_realtors: "Риелторы",
    foot_about_l: "О компании", foot_contacts: "Контакты", foot_terms: "Условия", foot_privacy: "Конфиденциальность",
    // карточки
    rooms_short: "комн.", per_m2: "за м²", deal_sale: "Продажа", deal_rent: "Аренда", deal_daily: "Посуточно",
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
    cat_found: "Found", cat_objects: "object(s)", chip_all: "All", f_rooms: "Rooms", f_anyRooms: "Any", f_studio: "Studio",
    f_yearFrom: "Year from", f_priceFrom: "Price from, $", f_areaFrom: "Area from, m²", f_areaTo: "Area to, m²", f_reset: "Reset", f_noCommission: "No commission", cat_empty: "No objects match this filter yet.",
    foot_about: "Property management, rent and sale in Georgia. New cities and a mobile app coming soon.",
    foot_realty: "Real estate", foot_company: "Company", foot_mgmt: "Property management", foot_cleaning: "Cleaning", foot_realtors: "Realtors",
    foot_about_l: "About", foot_contacts: "Contacts", foot_terms: "Terms", foot_privacy: "Privacy",
    rooms_short: "rooms", per_m2: "per m²", deal_sale: "Sale", deal_rent: "Rent", deal_daily: "Daily",
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
    cat_found: "ნაპოვნია", cat_objects: "ობიექტი", chip_all: "ყველა", f_rooms: "ოთახები", f_anyRooms: "ნებისმიერი", f_studio: "სტუდია",
    f_yearFrom: "წელი დან", f_priceFrom: "ფასი დან, $", f_areaFrom: "ფართობი დან, მ²", f_areaTo: "ფართობი მდე, მ²", f_reset: "გასუფთავება", f_noCommission: "უსაკომისიო", cat_empty: "ამ ფილტრით ობიექტები ჯერ არ არის.",
    foot_about: "უძრავი ქონების მართვა, ქირა და გაყიდვა საქართველოში. მალე — ახალი ქალაქები და მობილური აპლიკაცია.",
    foot_realty: "უძრავი ქონება", foot_company: "კომპანია", foot_mgmt: "ქონების მართვა", foot_cleaning: "დასუფთავება", foot_realtors: "რიელტორები",
    foot_about_l: "კომპანიის შესახებ", foot_contacts: "კონტაქტი", foot_terms: "პირობები", foot_privacy: "კონფიდენციალურობა",
    rooms_short: "ოთახი", per_m2: "მ²-ზე", deal_sale: "გაყიდვა", deal_rent: "ქირა", deal_daily: "დღიურად",
  },
};

export function t(lang, key) {
  const l = DICT[lang] ? lang : "ru";
  return DICT[l][key] || DICT.ru[key] || key;
}
