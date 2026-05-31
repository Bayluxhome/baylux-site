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
    badge_jk: "ЖК", badge_house: "Дом", w_from: "от", w_objects: "объект(ов)",
    // страница объекта/дома
    crumb_home: "Главная", crumb_catalog: "Каталог",
    cta_daily: "Забронировать даты", cta_rent: "Снять — оставить заявку", cta_view: "Забронировать просмотр",
    sp_type: "Тип", sp_area: "Площадь", sp_rooms: "Комнат", sp_bath: "Санузлов", sp_floor: "Этаж", sp_year: "Год постройки", sp_district: "Район", sp_deal: "Сделка", sp_complex: "ЖК / дом",
    boost_badge: "⭐ Продвигается",
    about_h: "Об объекте", about_p: "Готов к заселению, актуальные документы. Подходит как для проживания, так и под сдачу гостям.",
    near_h: "Что рядом", near_p: "Море и набережная в пешей доступности, рядом кафе, магазины и транспорт. Развитая инфраструктура района.",
    why_h: "Почему через Baylux", why_p: "Объект проверен нашей командой: документы, реальные фото, честная цена. Поможем с просмотром и сделкой, при желании возьмём в управление.",
    mgmt_btn: "Отдать похожую в управление", all_in: "Все объекты в", team: "Команда Baylux", team_sub: "Ответим за 5 минут · RU / EN / GE",
    bld_objects_here: "объект(ов) в продаже и аренде", bld_about_complex: "О комплексе", bld_about_house: "О доме", bld_units_here: "Объекты в этом доме",
    th_object: "Объект", th_area: "Площадь", th_floor: "Этаж", th_deal: "Сделка", th_price: "Цена",
    bld_cta_title: "Интересует объект в", bld_cta_sub: "Подберём под бюджет и задачу, организуем просмотр.", bld_lead: "Оставить заявку", bld_mgmt: "Сдать квартиру здесь в управление",
    // категории и подменю
    cat_apartment: "Квартиры", cat_house: "Дома", cat_commercial: "Коммерция", cat_office: "Офисы", cat_warehouse: "Склады", cat_land: "Участки", cat_garage: "Гаражи и паркинги", cat_jk: "Жилые комплексы", cat_cottage: "Коттеджи",
    cat_title: "Категории недвижимости", cat_subtitle: "Быстрый переход к нужному разделу — продажа, аренда, посуточно и услуги.", show_all: "Показать все", collapse: "Свернуть",
    t_apartment: "Квартира", t_studio: "Студия", t_house: "Дом", t_commercial: "Коммерция", t_office: "Офис", t_land: "Участок", t_garage: "Гараж", t_newbuild: "Новостройка",
    // форма добавления/редактирования
    af_country: "Страна", af_city: "Город", af_deal: "Тип сделки", af_type: "Тип объекта",
    af_complex: "Название ЖК / дома — по желанию", af_complex_ph: "напр. ЖК Orbi City (необязательно)",
    af_address: "Адрес (улица, дом)", af_address_ph: "ул. Шерифа Химшиашвили, 1",
    af_mapnote: "Точка на карте — ставится по адресу автоматически. Можно поправить кликом (включите спутник):",
    af_geo_auto: "📍 Точка поставлена по адресу — проверьте и при необходимости передвиньте кликом по карте.",
    af_geo_manual: "✓ Точка выбрана вручную.", af_geo_set: "✓ Точка выбрана", af_geo_hint: "Введите адрес — точка встанет сама, либо кликните по карте",
    af_price: "Цена", af_currency: "Валюта", af_area: "Площадь, м²", af_rooms: "Комнат", af_bath: "Санузлов", af_floor: "Этаж", af_year: "Год постройки",
    af_about: "Описание", af_about_ph: "Кратко об объекте", af_amen: "Удобства (по желанию)", af_nc: "Без комиссии с покупателя",
    af_phone: "Телефон для связи — Грузия, +995 (обязательно)", af_tg: "Telegram для связи (@username) — по желанию", af_tg_ph: "@username (необязательно)",
    af_cur_photos: "Текущие фото (нажмите ✕, чтобы убрать)", af_add_photos: "Добавить ещё фото", af_photos: "Фото (до 10, сжимаются автоматически)", af_newphotos: "новых фото",
    af_saving: "Сохраняю…", af_submit: "Отправить на модерацию", af_submit_edit: "Сохранить и отправить на модерацию", af_err: "Ошибка отправки. Проверьте поля и попробуйте снова.",
    af_alert_addr: "Укажите адрес объекта.", af_alert_phone: "Укажите грузинский номер телефона (+995). Например: +995 555 12 34 56.",
    af_done_add_h: "✅ Объявление отправлено на модерацию", af_done_edit_h: "✅ Изменения отправлены на модерацию",
    af_done_add_p: "Мы проверим его и опубликуем.", af_done_edit_p: "Объявление снято с публикации и появится снова после повторной проверки.",
    af_done_tail: "Статус — в разделе «Мои объявления».", af_my: "Мои объявления",
    am_furniture: "Мебель", am_balcony: "Балкон", am_terrace: "Терраса", am_parking: "Парковка", am_euro: "Ремонт «евро»", am_norenov: "Без ремонта", am_ac: "Кондиционер", am_elevator: "Лифт",
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
    badge_jk: "Complex", badge_house: "House", w_from: "from", w_objects: "object(s)",
    crumb_home: "Home", crumb_catalog: "Catalog",
    cta_daily: "Book dates", cta_rent: "Rent — send request", cta_view: "Book a viewing",
    sp_type: "Type", sp_area: "Area", sp_rooms: "Rooms", sp_bath: "Bathrooms", sp_floor: "Floor", sp_year: "Built", sp_district: "District", sp_deal: "Deal", sp_complex: "Complex / house",
    boost_badge: "⭐ Promoted",
    about_h: "About", about_p: "Ready to move in, valid documents. Suitable for living or short-term rental.",
    near_h: "Nearby", near_p: "Sea and promenade within walking distance, cafes, shops and transport nearby. Well-developed area.",
    why_h: "Why Baylux", why_p: "Verified by our team: documents, real photos, fair price. We help with viewing and the deal, and can take it under management.",
    mgmt_btn: "List a similar one for management", all_in: "All objects in", team: "Baylux team", team_sub: "We reply within 5 min · RU / EN / GE",
    bld_objects_here: "object(s) for sale and rent", bld_about_complex: "About the complex", bld_about_house: "About the house", bld_units_here: "Objects in this building",
    th_object: "Object", th_area: "Area", th_floor: "Floor", th_deal: "Deal", th_price: "Price",
    bld_cta_title: "Interested in an object in", bld_cta_sub: "We'll match your budget and arrange a viewing.", bld_lead: "Send request", bld_mgmt: "Put an apartment here under management",
    cat_apartment: "Apartments", cat_house: "Houses", cat_commercial: "Commercial", cat_office: "Offices", cat_warehouse: "Warehouses", cat_land: "Land plots", cat_garage: "Garages & parking", cat_jk: "Residential complexes", cat_cottage: "Cottages",
    cat_title: "Property categories", cat_subtitle: "Quick access — sale, rent, daily and services.", show_all: "Show all", collapse: "Collapse",
    t_apartment: "Apartment", t_studio: "Studio", t_house: "House", t_commercial: "Commercial", t_office: "Office", t_land: "Land plot", t_garage: "Garage", t_newbuild: "New building",
    af_country: "Country", af_city: "City", af_deal: "Deal type", af_type: "Property type",
    af_complex: "Complex / building name — optional", af_complex_ph: "e.g. Orbi City (optional)",
    af_address: "Address (street, building)", af_address_ph: "Sherif Khimshiashvili St, 1",
    af_mapnote: "Map point — set automatically from the address. You can adjust it by clicking (enable satellite):",
    af_geo_auto: "📍 Point set from the address — check it and move it by clicking the map if needed.",
    af_geo_manual: "✓ Point selected manually.", af_geo_set: "✓ Point selected", af_geo_hint: "Enter the address — the point will appear, or click on the map",
    af_price: "Price", af_currency: "Currency", af_area: "Area, m²", af_rooms: "Rooms", af_bath: "Bathrooms", af_floor: "Floor", af_year: "Year built",
    af_about: "Description", af_about_ph: "Briefly about the property", af_amen: "Amenities (optional)", af_nc: "No buyer commission",
    af_phone: "Contact phone — Georgia, +995 (required)", af_tg: "Telegram for contact (@username) — optional", af_tg_ph: "@username (optional)",
    af_cur_photos: "Current photos (click ✕ to remove)", af_add_photos: "Add more photos", af_photos: "Photos (up to 10, auto-compressed)", af_newphotos: "new photos",
    af_saving: "Saving…", af_submit: "Submit for moderation", af_submit_edit: "Save and submit for moderation", af_err: "Submit error. Check the fields and try again.",
    af_alert_addr: "Please enter the property address.", af_alert_phone: "Please enter a Georgian phone number (+995). For example: +995 555 12 34 56.",
    af_done_add_h: "✅ Listing submitted for moderation", af_done_edit_h: "✅ Changes submitted for moderation",
    af_done_add_p: "We'll review and publish it.", af_done_edit_p: "The listing was unpublished and will reappear after re-review.",
    af_done_tail: "Status is in the “My listings” section.", af_my: "My listings",
    am_furniture: "Furniture", am_balcony: "Balcony", am_terrace: "Terrace", am_parking: "Parking", am_euro: "Renovated (euro)", am_norenov: "No renovation", am_ac: "Air conditioning", am_elevator: "Elevator",
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
    badge_jk: "კომპლექსი", badge_house: "სახლი", w_from: "დან", w_objects: "ობიექტი",
    crumb_home: "მთავარი", crumb_catalog: "კატალოგი",
    cta_daily: "თარიღების დაჯავშნა", cta_rent: "ქირაობა — განაცხადი", cta_view: "დათვალიერების ჯავშანი",
    sp_type: "ტიპი", sp_area: "ფართობი", sp_rooms: "ოთახები", sp_bath: "სველი წერტილი", sp_floor: "სართული", sp_year: "აშენების წელი", sp_district: "რაიონი", sp_deal: "გარიგება", sp_complex: "კომპლექსი / სახლი",
    boost_badge: "⭐ წახალისებული",
    about_h: "ობიექტის შესახებ", about_p: "მზადაა შესასახლებლად, აქვს დოკუმენტები. გამოდგება საცხოვრებლად და გასაქირავებლად.",
    near_h: "ახლომახლო", near_p: "ზღვა და ბულვარი ფეხით ახლოს, კაფეები, მაღაზიები და ტრანსპორტი. განვითარებული ინფრასტრუქტურა.",
    why_h: "რატომ Baylux", why_p: "შემოწმებულია ჩვენი გუნდის მიერ: დოკუმენტები, რეალური ფოტოები, სამართლიანი ფასი. დაგეხმარებით დათვალიერებასა და გარიგებაში.",
    mgmt_btn: "მსგავსის მართვაში გადაცემა", all_in: "ყველა ობიექტი —", team: "Baylux გუნდი", team_sub: "ვუპასუხებთ 5 წუთში · RU / EN / GE",
    bld_objects_here: "ობიექტი იყიდება და ქირავდება", bld_about_complex: "კომპლექსის შესახებ", bld_about_house: "სახლის შესახებ", bld_units_here: "ობიექტები ამ სახლში",
    th_object: "ობიექტი", th_area: "ფართობი", th_floor: "სართული", th_deal: "გარიგება", th_price: "ფასი",
    bld_cta_title: "გაინტერესებთ ობიექტი —", bld_cta_sub: "შევარჩევთ ბიუჯეტის მიხედვით და მოვაწყობთ ჩვენებას.", bld_lead: "განაცხადის დატოვება", bld_mgmt: "ბინის მართვაში გადაცემა",
    cat_apartment: "ბინები", cat_house: "სახლები", cat_commercial: "კომერციული", cat_office: "ოფისები", cat_warehouse: "საწყობები", cat_land: "მიწის ნაკვეთები", cat_garage: "გარაჟები და პარკინგი", cat_jk: "საცხოვრებელი კომპლექსები", cat_cottage: "კოტეჯები",
    cat_title: "უძრავი ქონების კატეგორიები", cat_subtitle: "სწრაფი გადასვლა — გაყიდვა, ქირა, დღიურად და სერვისები.", show_all: "ყველას ჩვენება", collapse: "დაკეცვა",
    t_apartment: "ბინა", t_studio: "სტუდია", t_house: "სახლი", t_commercial: "კომერციული", t_office: "ოფისი", t_land: "მიწის ნაკვეთი", t_garage: "გარაჟი", t_newbuild: "ახალი კორპუსი",
    af_country: "ქვეყანა", af_city: "ქალაქი", af_deal: "გარიგების ტიპი", af_type: "ობიექტის ტიპი",
    af_complex: "კომპლექსის / სახლის სახელი — სურვილისამებრ", af_complex_ph: "მაგ. Orbi City (არასავალდებულო)",
    af_address: "მისამართი (ქუჩა, სახლი)", af_address_ph: "შერიფ ხიმშიაშვილის ქ. 1",
    af_mapnote: "წერტილი რუკაზე — მისამართის მიხედვით ავტომატურად. შეგიძლიათ შეასწოროთ დაჭერით (ჩართეთ სატელიტი):",
    af_geo_auto: "📍 წერტილი დაყენებულია მისამართის მიხედვით — შეამოწმეთ და საჭიროების შემთხვევაში გადაიტანეთ რუკაზე დაჭერით.",
    af_geo_manual: "✓ წერტილი არჩეულია ხელით.", af_geo_set: "✓ წერტილი არჩეულია", af_geo_hint: "შეიყვანეთ მისამართი — წერტილი თავად გამოჩნდება, ან დააჭირეთ რუკას",
    af_price: "ფასი", af_currency: "ვალუტა", af_area: "ფართობი, მ²", af_rooms: "ოთახები", af_bath: "სველი წერტილი", af_floor: "სართული", af_year: "აშენების წელი",
    af_about: "აღწერა", af_about_ph: "მოკლედ ობიექტის შესახებ", af_amen: "კეთილმოწყობა (სურვილისამებრ)", af_nc: "მყიდველისგან საკომისიოს გარეშე",
    af_phone: "საკონტაქტო ტელეფონი — საქართველო, +995 (სავალდებულო)", af_tg: "Telegram კონტაქტისთვის (@username) — სურვილისამებრ", af_tg_ph: "@username (არასავალდებულო)",
    af_cur_photos: "მიმდინარე ფოტოები (დააჭირეთ ✕ მოსაშორებლად)", af_add_photos: "სხვა ფოტოების დამატება", af_photos: "ფოტოები (10-მდე, ავტომატურად იკუმშება)", af_newphotos: "ახალი ფოტო",
    af_saving: "ვინახავ…", af_submit: "მოდერაციაზე გაგზავნა", af_submit_edit: "შენახვა და მოდერაციაზე გაგზავნა", af_err: "გაგზავნის შეცდომა. შეამოწმეთ ველები და სცადეთ თავიდან.",
    af_alert_addr: "მიუთითეთ ობიექტის მისამართი.", af_alert_phone: "მიუთითეთ ქართული ტელეფონის ნომერი (+995). მაგ.: +995 555 12 34 56.",
    af_done_add_h: "✅ განცხადება გაგზავნილია მოდერაციაზე", af_done_edit_h: "✅ ცვლილებები გაგზავნილია მოდერაციაზე",
    af_done_add_p: "ჩვენ შევამოწმებთ და გამოვაქვეყნებთ.", af_done_edit_p: "განცხადება მოიხსნა გამოქვეყნებიდან და ხელახლა შემოწმების შემდეგ კვლავ გამოჩნდება.",
    af_done_tail: "სტატუსი — განყოფილებაში „ჩემი განცხადებები“.", af_my: "ჩემი განცხადებები",
    am_furniture: "ავეჯი", am_balcony: "აივანი", am_terrace: "ტერასა", am_parking: "პარკინგი", am_euro: "ევრორემონტი", am_norenov: "რემონტის გარეშე", am_ac: "კონდიციონერი", am_elevator: "ლიფტი",
  },
};

export function t(lang, key) {
  const l = DICT[lang] ? lang : "ru";
  return DICT[l][key] || DICT.ru[key] || key;
}

// Названия типов объектов хранятся по-русски; переводим для отображения.
const TYPE_KEY = {
  "Квартира": "t_apartment", "Студия": "t_studio", "Дом": "t_house", "Коммерция": "t_commercial",
  "Офис": "t_office", "Участок": "t_land", "Гараж": "t_garage", "Новостройка": "t_newbuild",
};
export function typeLabel(lang, type) {
  const k = TYPE_KEY[type];
  return k ? t(lang, k) : (type || "");
}

// Удобства хранятся по-русски (значение фильтра); переводим только подпись.
const AMEN_KEY = {
  "Мебель": "am_furniture", "Балкон": "am_balcony", "Терраса": "am_terrace", "Парковка": "am_parking",
  "Ремонт «евро»": "am_euro", "Без ремонта": "am_norenov", "Кондиционер": "am_ac", "Лифт": "am_elevator",
};
export function amenLabel(lang, a) {
  const k = AMEN_KEY[a];
  return k ? t(lang, k) : (a || "");
}
