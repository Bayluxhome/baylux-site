// Статьи блога Baylux. Статичный контент в репозитории (без БД — не грузит Supabase).
// Каждая статья: slug, дата, обложка (из /public) + title/excerpt/body на 3 языках (ru/en/ka).
// body — HTML-строка (рендерится через dangerouslySetInnerHTML в стилизованном контейнере).
// Цель — низкоконкурентные/информационные запросы + внутренние ссылки на каталог и лендинги.

export const ARTICLES = [
  {
    slug: "kak-kupit-kvartiru-v-batumi",
    date: "2026-07-11",
    image: "/hero-batumi.webp",
    ru: {
      title: "Как купить квартиру в Батуми: пошаговый гид для покупателя (2026)",
      excerpt: "Как выбрать район и объект, проверить квартиру, оформить сделку за 7–14 дней, какие налоги платит иностранец и как получить ВНЖ при покупке в Батуми.",
      body: `
<p>Батуми — один из самых доступных для входа приморских рынков: цены ниже, чем в центре Тбилиси и на европейских курортах, а порог покупки для иностранца минимальный. Разберём по шагам, как выбрать и купить квартиру в Батуми, на что смотреть и каких ошибок избегать.</p>
<h2>Определите цель покупки</h2>
<p>От цели зависит и район, и тип объекта. <b>Для жизни</b> — важны инфраструктура, тишина и готовый ремонт. <b>Для сдачи в аренду</b> — близость к морю и бульвару, апартаменты в комплексах с управляющей компанией. <b>Для инвестиции</b> — новостройки на ранней стадии, где цена ниже, а рост выше. Если планируете сдавать — заранее прикиньте доходность и посмотрите <a href="/property-management">управление недвижимостью</a>.</p>
<h2>Выберите район</h2>
<p>Ориентир по ценам новостроек: Химшиашвили — от $1200/м², Новый бульвар — от $1300/м², Кахабери — около $2150/м², Руставели и Старый город — $1800–3500/м². Чем ближе к морю и центру, тем дороже и ликвиднее. Полный разбор районов и цен — на странице <a href="/kupit-kvartiru-batumi">покупки квартиры в Батуми</a>.</p>
<h2>Новостройка или вторичка</h2>
<p><b>Новостройка</b> — ниже цена на старте, современные планировки, рассрочка от застройщика, но нужно дождаться сдачи. <b>Вторичка</b> — можно заезжать сразу и видно реальное состояние дома. Актуальные проекты смотрите в разделе <a href="/novostroyki-batumi">новостроек Батуми</a>.</p>
<h2>Проверьте объект перед сделкой</h2>
<p>Ключевой этап — юридическая чистота. Проверяется по Публичному реестру: кто собственник, нет ли обременений и арестов. Для новостройки — репутация застройщика, разрешение на строительство и стадия готовности. Не вносите задаток до проверки.</p>
<h2>Сама сделка</h2>
<p>Иностранцы покупают в Грузии без ограничений — достаточно загранпаспорта, без спецразрешений и апостиля. Договор подписывается у нотариуса, сделка регистрируется в Доме юстиции за 1–2 дня. Весь процесс обычно занимает 7–14 дней и возможен дистанционно по доверенности.</p>
<h2>Налоги и ВНЖ</h2>
<p>НДС при покупке нет. Налог на владение — до 1% в год (для квартир максимум ~200 GEL). При перепродаже через 2 года и больше — 0%. А покупка на сумму от $150 000 даёт право претендовать на инвестиционный ВНЖ. Ставки периодически меняются — уточняйте актуальные у местного юриста.</p>
<h2>Частые ошибки</h2>
<p>Покупка по фото без видеосвязи; задаток до проверки собственника; выбор только по цене без учёта ликвидности при перепродаже; игнорирование расходов на управление при сдаче. Baylux сопровождает сделку от подбора до ключей и проверяет каждый объект — начните с <a href="/kupit-kvartiru-batumi">каталога квартир на продажу в Батуми</a>.</p>`,
    },
    en: {
      title: "How to buy an apartment in Batumi: a step-by-step buyer's guide (2026)",
      excerpt: "How to choose a district and property, check the apartment, close the deal in 7–14 days, what taxes a foreigner pays and how to get residency when buying in Batumi.",
      body: `
<p>Batumi is one of the most affordable seaside property markets to enter: prices are lower than in central Tbilisi or European resorts, and the entry barrier for a foreigner is minimal. Here is a step-by-step guide on how to choose and buy an apartment in Batumi, what to look for and which mistakes to avoid.</p>
<h2>Define your goal</h2>
<p>Your goal drives both the district and the type of property. <b>To live in</b> — infrastructure, quiet and a finished renovation matter most. <b>To rent out</b> — proximity to the sea and boulevard, apartments in complexes with a management company. <b>To invest</b> — early-stage new builds where the price is lower and growth higher. If you plan to rent it out, estimate the yield in advance and look at <a href="/property-management">property management</a>.</p>
<h2>Choose a district</h2>
<p>New-build price guide: Khimshiashvili from $1,200/m², New Boulevard from $1,300/m², Kakhaberi around $2,150/m², Rustaveli and the Old Town $1,800–3,500/m². The closer to the sea and centre, the more expensive and liquid. A full district and price breakdown is on the <a href="/kupit-kvartiru-batumi">buying an apartment in Batumi</a> page.</p>
<h2>New build or resale</h2>
<p><b>New build</b> — lower entry price, modern layouts, developer instalments, but you wait for completion. <b>Resale</b> — move in immediately and see the real condition of the building. See current projects in the <a href="/novostroyki-batumi">Batumi new builds</a> section.</p>
<h2>Check the property before the deal</h2>
<p>The key stage is legal due diligence. It is verified via the Public Registry: who owns it and whether there are encumbrances or seizures. For a new build — the developer's reputation, the construction permit and the stage of completion. Do not pay a deposit before the check.</p>
<h2>The deal itself</h2>
<p>Foreigners buy in Georgia without restrictions — a foreign passport is enough, no special permits or apostille. The contract is signed at a notary and the deal is registered at the Public Service Hall within 1–2 days. The whole process usually takes 7–14 days and can be done remotely by power of attorney.</p>
<h2>Taxes and residency</h2>
<p>No VAT on purchase. Ownership tax is up to 1% per year (max ~200 GEL for apartments). On resale after two years or more — 0%. And buying property worth $150,000 or more lets you apply for an investment residence permit. Rates change from time to time — confirm current ones with a local lawyer.</p>
<h2>Common mistakes</h2>
<p>Buying from photos without a video call; a deposit before checking the owner; choosing on price alone without considering resale liquidity; ignoring management costs when renting out. Baylux supports the deal from selection to keys and verifies every property — start with the <a href="/kupit-kvartiru-batumi">catalog of apartments for sale in Batumi</a>.</p>`,
    },
    ka: {
      title: "როგორ ვიყიდოთ ბინა ბათუმში: მყიდველის სახელმძღვანელო ნაბიჯ-ნაბიჯ (2026)",
      excerpt: "როგორ ავირჩიოთ უბანი და ობიექტი, შევამოწმოთ ბინა, გავაფორმოთ გარიგება 7–14 დღეში, რა გადასახადებს იხდის უცხოელი და როგორ მივიღოთ ბინადრობა ბათუმში ყიდვისას.",
      body: `
<p>ბათუმი ერთ-ერთი ყველაზე ხელმისაწვდომი ზღვისპირა ბაზარია: ფასები დაბალია ვიდრე თბილისის ცენტრში ან ევროპულ კურორტებზე, უცხოელისთვის კი შესვლის ბარიერი მინიმალურია. განვიხილოთ ნაბიჯ-ნაბიჯ, როგორ ავირჩიოთ და ვიყიდოთ ბინა ბათუმში, რას მივაქციოთ ყურადღება და რომელი შეცდომები ავიცილოთ.</p>
<h2>განსაზღვრეთ ყიდვის მიზანი</h2>
<p>მიზანზეა დამოკიდებული უბანიც და ობიექტის ტიპიც. <b>საცხოვრებლად</b> — მნიშვნელოვანია ინფრასტრუქტურა, სიმშვიდე და მზა რემონტი. <b>გასაქირავებლად</b> — ზღვასთან და ბულვართან სიახლოვე, აპარტამენტები მმართველი კომპანიის მქონე კომპლექსებში. <b>ინვესტიციისთვის</b> — ადრეული ეტაპის ახალი კორპუსები, სადაც ფასი დაბალია, ზრდა კი მაღალი. თუ გაქირავებას გეგმავთ — წინასწარ შეაფასეთ სარგებელი და იხილეთ <a href="/property-management">უძრავი ქონების მართვა</a>.</p>
<h2>აირჩიეთ უბანი</h2>
<p>ახალი კორპუსების ფასების ორიენტირი: ხიმშიაშვილი — $1200/მ²-დან, ახალი ბულვარი — $1300/მ²-დან, კახაბერი — დაახლოებით $2150/მ², რუსთაველი და ძველი ქალაქი — $1800–3500/მ². რაც უფრო ახლოს ზღვასა და ცენტრთან, მით უფრო ძვირი და ლიკვიდურია. უბნებისა და ფასების სრული მიმოხილვა — გვერდზე <a href="/kupit-kvartiru-batumi">ბინის ყიდვა ბათუმში</a>.</p>
<h2>ახალი კორპუსი თუ მეორადი</h2>
<p><b>ახალი კორპუსი</b> — დაბალი საწყისი ფასი, თანამედროვე დაგეგმარება, განვადება დეველოპერისგან, თუმცა უნდა დაელოდოთ ჩაბარებას. <b>მეორადი</b> — მაშინვე შეგიძლიათ შესვლა და ჩანს შენობის რეალური მდგომარეობა. მიმდინარე პროექტები იხილეთ <a href="/novostroyki-batumi">ბათუმის ახალი კორპუსების</a> განყოფილებაში.</p>
<h2>შეამოწმეთ ობიექტი გარიგებამდე</h2>
<p>მთავარი ეტაპი — იურიდიული სისუფთავე. მოწმდება საჯარო რეესტრში: ვინ არის მესაკუთრე, ხომ არ არის ყადაღა ან სხვა შეზღუდვა. ახალი კორპუსისთვის — დეველოპერის რეპუტაცია, მშენებლობის ნებართვა და მზადყოფნის ეტაპი. ნუ შეიტანთ ბეს შემოწმებამდე.</p>
<h2>თავად გარიგება</h2>
<p>უცხოელები საქართველოში ყიდულობენ შეზღუდვების გარეშე — საკმარისია უცხოური პასპორტი, სპეციალური ნებართვისა და აპოსტილის გარეშე. ხელშეკრულება ფორმდება ნოტარიუსთან, გარიგება რეგისტრირდება იუსტიციის სახლში 1–2 დღეში. მთელი პროცესი ჩვეულებრივ 7–14 დღეს გრძელდება და შესაძლებელია დისტანციურადაც მინდობილობით.</p>
<h2>გადასახადები და ბინადრობა</h2>
<p>ყიდვისას დღგ არ არის. ქონების გადასახადი — წელიწადში 1%-მდე (ბინებზე მაქსიმუმ ~200 ლარი). 2 წლის ან მეტის შემდეგ გადაყიდვისას — 0%. ხოლო $150 000-დან ქონების შეძენა გაძლევთ საინვესტიციო ბინადრობის ნებართვაზე განაცხადის უფლებას. განაკვეთები დროდადრო იცვლება — დააზუსტეთ ადგილობრივ იურისტთან.</p>
<h2>ხშირი შეცდომები</h2>
<p>ყიდვა ფოტოებით ვიდეოზარის გარეშე; ბე მესაკუთრის შემოწმებამდე; არჩევანი მხოლოდ ფასით, გადაყიდვის ლიკვიდურობის გათვალისწინების გარეშე; მართვის ხარჯების იგნორირება გაქირავებისას. Baylux უზრუნველყოფს გარიგების თანხლებას შერჩევიდან გასაღებამდე და ამოწმებს ყველა ობიექტს — დაიწყეთ <a href="/kupit-kvartiru-batumi">ბათუმში გასაყიდი ბინების კატალოგით</a>.</p>`,
    },
  },
  {
    slug: "arenda-kvartiry-tbilisi",
    date: "2026-06-20",
    image: "/hero-tbilisi.webp",
    ru: {
      title: "Аренда квартиры в Тбилиси: районы, цены и как снять онлайн",
      excerpt: "Сколько стоит аренда в Тбилиси по районам, чем отличается долгосрочная аренда от посуточной и как снять квартиру удалённо, не приезжая на просмотр.",
      body: `
<p>Тбилиси — один из самых востребованных городов Грузии для долгосрочной аренды: сюда переезжают на работу, учёбу и удалёнку. Цены зависят прежде всего от района, состояния ремонта и близости к метро.</p>
<h2>Районы и ориентир по ценам</h2>
<p><b>Сабуртало и Ваке</b> — деловые и престижные районы с развитой инфраструктурой; студии здесь обычно от $500–900 в месяц, видовые и большие квартиры — дороже. <b>Старый город и Авлабари</b> — атмосферный центр, удобно для тех, кто хочет жить рядом с достопримечательностями. Более доступные варианты ищите дальше от центра.</p>
<h2>Долгосрочная или посуточная</h2>
<p>Долгосрочная аренда (от 12 месяцев) — самый стабильный вариант с фиксированной ценой; коммунальные обычно оплачивает арендатор. Посуточная выгоднее в сезон, но требует управления. Если вы собственник и не хотите заниматься этим сами — посмотрите <a href="/property-management">управление недвижимостью Baylux</a>.</p>
<h2>Как снять удалённо</h2>
<p>Многие арендаторы выбирают квартиру дистанционно: по реальным фото, видео и онлайн-показу. Важно проверять, что объявление актуально и без скрытой комиссии. В каталоге Baylux все объекты проходят модерацию — смотрите <a href="/arenda-tbilisi">аренду квартир в Тбилиси</a> или весь <a href="/catalog?city=%D0%A2%D0%B1%D0%B8%D0%BB%D0%B8%D1%81%D0%B8">каталог по Тбилиси</a>.</p>
<p>Совет: бронируйте только после видеосвязи с квартирой и уточняйте, что входит в стоимость (мебель, техника, интернет, коммунальные).</p>`,
    },
    en: {
      title: "Renting an apartment in Tbilisi: districts, prices and how to rent online",
      excerpt: "How much rent costs in Tbilisi by district, the difference between long-term and daily rental, and how to rent an apartment remotely without a viewing.",
      body: `
<p>Tbilisi is one of the most in-demand cities in Georgia for long-term rentals — people relocate here for work, study and remote jobs. Prices depend mainly on the district, the condition of the renovation and the distance to the metro.</p>
<h2>Districts and price guide</h2>
<p><b>Saburtalo and Vake</b> are business and prestige districts with strong infrastructure; studios here usually start at $500–900 per month, with larger and view apartments costing more. <b>Old Town and Avlabari</b> form the atmospheric centre, convenient for living near the sights. More affordable options are further from the centre.</p>
<h2>Long-term or daily</h2>
<p>Long-term rental (12+ months) is the most stable option with a fixed price; utilities are usually paid by the tenant. Daily rental earns more in season but needs management. If you are an owner and don't want to handle it yourself, see <a href="/property-management">Baylux property management</a>.</p>
<h2>How to rent remotely</h2>
<p>Many tenants choose an apartment remotely — from real photos, video and an online viewing. Make sure the listing is current and has no hidden fees. Every Baylux listing is moderated — browse <a href="/arenda-tbilisi">apartments for rent in Tbilisi</a> or the full <a href="/catalog?city=%D0%A2%D0%B1%D0%B8%D0%BB%D0%B8%D1%81%D0%B8">Tbilisi catalogue</a>.</p>
<p>Tip: book only after a video call with the apartment and confirm what's included (furniture, appliances, internet, utilities).</p>`,
    },
    ka: {
      title: "ბინის ქირაობა თბილისში: უბნები, ფასები და როგორ ვიქირაოთ ონლაინ",
      excerpt: "რა ღირს ქირა თბილისში უბნების მიხედვით, რით განსხვავდება გრძელვადიანი ქირა დღიურისგან და როგორ ვიქირაოთ ბინა დისტანციურად.",
      body: `
<p>თბილისი საქართველოს ერთ-ერთი ყველაზე მოთხოვნადი ქალაქია გრძელვადიანი ქირაობისთვის — აქ ჩამოდიან სამუშაოდ, სასწავლებლად და დისტანციური მუშაობისთვის. ფასი დამოკიდებულია უბანზე, რემონტის მდგომარეობასა და მეტროსთან სიახლოვეზე.</p>
<h2>უბნები და ფასები</h2>
<p><b>საბურთალო და ვაკე</b> — საქმიანი და პრესტიჟული უბნებია; სტუდიო აქ ჩვეულებრივ თვეში $500–900-დან იწყება, დიდი და ხედიანი ბინები — უფრო ძვირი. <b>ძველი ქალაქი და ავლაბარი</b> — ატმოსფერული ცენტრი. უფრო ხელმისაწვდომი ვარიანტები ცენტრიდან მოშორებითაა.</p>
<h2>გრძელვადიანი თუ დღიური</h2>
<p>გრძელვადიანი ქირა (12+ თვე) ყველაზე სტაბილურია ფიქსირებული ფასით; კომუნალურს ჩვეულებრივ მოიჯარე იხდის. დღიური სეზონზე უფრო მომგებიანია, მაგრამ მართვას საჭიროებს. თუ მფლობელი ხართ — იხილეთ <a href="/property-management">Baylux-ის ქონების მართვა</a>.</p>
<h2>როგორ ვიქირაოთ დისტანციურად</h2>
<p>ბევრი მოიჯარე ბინას დისტანციურად ირჩევს — რეალური ფოტოებით, ვიდეოთი და ონლაინ ჩვენებით. Baylux-ის ყველა ობიექტი მოდერაციას გადის — იხილეთ <a href="/arenda-tbilisi">ბინების ქირა თბილისში</a> ან სრული <a href="/catalog?city=%D0%A2%D0%B1%D0%B8%D0%BB%D0%B8%D1%81%D0%B8">კატალოგი</a>.</p>
<p>რჩევა: დაჯავშნეთ მხოლოდ ვიდეოზარის შემდეგ და დააზუსტეთ, რა შედის ფასში (ავეჯი, ტექნიკა, ინტერნეტი, კომუნალური).</p>`,
    },
  },
  {
    slug: "zhilye-kompleksy-gruzii-zona-otdykha",
    date: "2026-06-18",
    image: "/hero-batumi.jpg",
    ru: {
      title: "Жилые комплексы Грузии с зоной отдыха: бассейн, спа и сервис",
      excerpt: "Чем хороши новостройки с инфраструктурой — бассейн, спа, охрана, управление — и на что смотреть при покупке квартиры в таком ЖК в Батуми и Грузии.",
      body: `
<p>Современные жилые комплексы в Грузии всё чаще строят как курорт: бассейны, спа, фитнес, озеленённая территория, охрана и управляющая компания. Такой формат удобен и для жизни, и для сдачи в аренду.</p>
<h2>Что обычно входит в зону отдыха</h2>
<p>В премиальных ЖК Батуми и побережья встречаются открытые и крытые бассейны, спа и сауны, лаунж-зоны на крыше, детские площадки, подземный паркинг и видеонаблюдение. Часть комплексов предлагает гостиничный сервис — уборку и управление арендой.</p>
<h2>Почему это выгодно при сдаче</h2>
<p>Квартира в ЖК с инфраструктурой и видом на море сдаётся дороже и быстрее, особенно посуточно в сезон. Если планируете именно инвестицию — оцените доходность заранее и посмотрите <a href="/property-management">управление под ключ</a>, чтобы не заниматься гостями самому.</p>
<h2>На что смотреть при выборе</h2>
<p>Проверяйте застройщика и стадию готовности, реальные фото (а не только рендеры), что входит в обслуживание и его стоимость. Подборку строящегося и готового жилья смотрите в разделе <a href="/novostroyki-batumi">новостройки Батуми</a> или в общем <a href="/catalog">каталоге недвижимости</a>.</p>`,
    },
    en: {
      title: "Residential complexes in Georgia with amenities: pool, spa and service",
      excerpt: "Why new buildings with infrastructure — pool, spa, security, management — are worth it, and what to check when buying an apartment in such a complex in Batumi.",
      body: `
<p>Modern residential complexes in Georgia are increasingly built like resorts: pools, spa, fitness, landscaped grounds, security and a management company. This format works well both for living and for renting out.</p>
<h2>What the amenity zone usually includes</h2>
<p>Premium complexes in Batumi and along the coast often feature open and indoor pools, spa and saunas, rooftop lounges, playgrounds, underground parking and CCTV. Some offer hotel-style service — cleaning and rental management.</p>
<h2>Why it pays off when renting</h2>
<p>An apartment in a complex with amenities and a sea view rents faster and for more, especially daily in season. If you're investing, estimate the yield in advance and consider <a href="/property-management">turnkey management</a> so you don't deal with guests yourself.</p>
<h2>What to check</h2>
<p>Verify the developer and construction stage, real photos (not only renders), what the service includes and its cost. See our selection in <a href="/novostroyki-batumi">new buildings in Batumi</a> or the full <a href="/catalog">property catalogue</a>.</p>`,
    },
    ka: {
      title: "საცხოვრებელი კომპლექსები საქართველოში დასვენების ზონით: აუზი, სპა და სერვისი",
      excerpt: "რატომ ღირს ინფრასტრუქტურიანი ახალაშენებები — აუზი, სპა, დაცვა, მართვა — და რას მივაქციოთ ყურადღება ბათუმში ბინის ყიდვისას.",
      body: `
<p>თანამედროვე საცხოვრებელ კომპლექსებს საქართველოში სულ უფრო ხშირად კურორტივით აშენებენ: აუზები, სპა, ფიტნესი, გამწვანებული ტერიტორია, დაცვა და მმართველი კომპანია. ეს ფორმატი მოსახერხებელია როგორც საცხოვრებლად, ისე გასაქირავებლად.</p>
<h2>რა შედის დასვენების ზონაში</h2>
<p>ბათუმისა და სანაპიროს პრემიუმ კომპლექსებში გვხვდება ღია და დახურული აუზები, სპა და საუნა, სახურავის ლაუნჯები, საბავშვო მოედნები, მიწისქვეშა პარკინგი და ვიდეოკონტროლი. ნაწილი სასტუმროს სერვისს სთავაზობს — დასუფთავებას და ქირის მართვას.</p>
<h2>რატომ არის მომგებიანი გაქირავებისას</h2>
<p>ინფრასტრუქტურიანი და ზღვის ხედიანი ბინა უფრო სწრაფად და ძვირად ქირავდება, განსაკუთრებით დღიურად სეზონზე. თუ ინვესტიციას გეგმავთ — იხილეთ <a href="/property-management">მართვა გასაღებზე</a>.</p>
<h2>რას მივაქციოთ ყურადღება</h2>
<p>შეამოწმეთ დეველოპერი და მზადყოფნის ეტაპი, რეალური ფოტოები, რა შედის მომსახურებაში და მისი ღირებულება. იხილეთ <a href="/novostroyki-batumi">ახალაშენებები ბათუმში</a> ან სრული <a href="/catalog">კატალოგი</a>.</p>`,
    },
  },
  {
    slug: "posutochnaya-arenda-batumi",
    date: "2026-06-15",
    image: "/hero-georgia.webp",
    ru: {
      title: "Посуточная аренда в Батуми: цены, сезонность и как сдавать выгодно",
      excerpt: "Как устроена посуточная аренда в Батуми, как меняются цены по сезонам и что выгоднее собственнику — сдавать самому или отдать в управление.",
      body: `
<p>Батуми — морской курорт, и посуточная аренда здесь сильно зависит от сезона. В пик (июнь–сентябрь) спрос и цены максимальны, в межсезонье — спадают, и многие переходят на краткосрочную или долгосрочную аренду.</p>
<h2>Сезонность и загрузка</h2>
<p>В сезон хорошо управляемая студия у моря может быть занята большую часть месяца; в межсезонье загрузка падает, поэтому годовой доход стоит считать по смешанной модели: посуточно летом и помесячно зимой.</p>
<h2>Сдавать самому или через управление</h2>
<p>Самостоятельная сдача — это объявления, общение с гостями, заселение, уборка и бельё. Если времени нет или объектов несколько, выгоднее управление под ключ: гости, клининг и отчёты — на компании. Прикинуть доход по форматам можно в <a href="/property-management">калькуляторе доходности</a>.</p>
<h2>Что повышает доход</h2>
<p>Качественные фото, честное описание, чистота и быстрые ответы на заявки. Готовые посуточные варианты смотрите в разделе <a href="/posutochno-batumi">посуточная аренда в Батуми</a> или во всём <a href="/catalog">каталоге</a>.</p>`,
    },
    en: {
      title: "Daily rental in Batumi: prices, seasonality and how to rent out profitably",
      excerpt: "How daily rental works in Batumi, how prices change by season, and what's better for an owner — renting out yourself or using management.",
      body: `
<p>Batumi is a seaside resort, so daily rental here depends heavily on the season. At the peak (June–September) demand and prices are highest; in the off-season they drop and many switch to short- or long-term rental.</p>
<h2>Seasonality and occupancy</h2>
<p>In season a well-managed seaside studio can be booked most of the month; in the off-season occupancy falls, so annual income is best estimated with a mixed model: daily in summer, monthly in winter.</p>
<h2>Self-manage or use management</h2>
<p>Self-managing means listings, guest communication, check-ins, cleaning and linen. If you lack time or have several units, turnkey management is more profitable — guests, cleaning and reports are handled for you. Estimate income by format in our <a href="/property-management">yield calculator</a>.</p>
<h2>What increases income</h2>
<p>Quality photos, honest descriptions, cleanliness and fast replies. See ready daily options in <a href="/posutochno-batumi">daily rental in Batumi</a> or the whole <a href="/catalog">catalogue</a>.</p>`,
    },
    ka: {
      title: "დღიური ქირა ბათუმში: ფასები, სეზონურობა და როგორ გავაქირაოთ მომგებიანად",
      excerpt: "როგორ მუშაობს დღიური ქირა ბათუმში, როგორ იცვლება ფასები სეზონების მიხედვით და რა ჯობია მფლობელს — თავად გააქირაოს თუ მართვაში ჩააბაროს.",
      body: `
<p>ბათუმი ზღვისპირა კურორტია, ამიტომ დღიური ქირა აქ ძლიერ არის დამოკიდებული სეზონზე. პიკზე (ივნისი–სექტემბერი) მოთხოვნა და ფასები მაქსიმალურია; არასეზონზე ეცემა და ბევრი მოკლე- ან გრძელვადიან ქირაზე გადადის.</p>
<h2>სეზონურობა და დატვირთვა</h2>
<p>სეზონზე კარგად მართული ზღვისპირა სტუდიო თვის უმეტეს ნაწილში შეიძლება დაკავებული იყოს; არასეზონზე დატვირთვა ეცემა, ამიტომ წლიური შემოსავალი ჯობია შერეული მოდელით დაითვალოს.</p>
<h2>თავად თუ მართვით</h2>
<p>დამოუკიდებელი გაქირავება — ეს არის განცხადებები, სტუმრებთან კომუნიკაცია, დასახლება, დასუფთავება და თეთრეული. თუ დრო არ გაქვთ — მართვა გასაღებზე უფრო მომგებიანია. შემოსავალი შეაფასეთ <a href="/property-management">კალკულატორში</a>.</p>
<h2>რა ზრდის შემოსავალს</h2>
<p>ხარისხიანი ფოტოები, გულახდილი აღწერა, სისუფთავე და სწრაფი პასუხები. იხილეთ <a href="/posutochno-batumi">დღიური ქირა ბათუმში</a> ან სრული <a href="/catalog">კატალოგი</a>.</p>`,
    },
  },
  {
    slug: "arenda-kvartiry-batumi",
    date: "2026-06-21",
    image: "/hero-batumi.jpg",
    ru: {
      title: "Аренда квартиры в Батуми: цены, районы, долгосрочно и помесячно",
      excerpt: "Сколько стоит снять квартиру в Батуми, чем отличаются районы у моря и в городе, и как выбрать между помесячной и долгосрочной арендой.",
      body: `
<p>Батуми сочетает курорт и город, поэтому аренда здесь интересна и туристам, и тем, кто переезжает надолго. Цена зависит от близости к морю, новизны дома и наличия инфраструктуры.</p>
<h2>Районы и цены</h2>
<p>Новый бульвар и первая линия у моря — самые дорогие; студии тут обычно от $500–800 в месяц. Дальше от моря и в городской части — доступнее. Видовые квартиры в новых ЖК с бассейном стоят выше, но и сдаются быстрее.</p>
<h2>Помесячно или на год</h2>
<p>Долгосрочная аренда (от 12 месяцев) даёт лучшую цену за месяц и стабильность; коммунальные платит арендатор. Помесячная гибче, но дороже. Если вы собственник и хотите стабильный доход без хлопот — посмотрите <a href="/property-management">управление недвижимостью</a> и прикиньте доход в калькуляторе.</p>
<h2>Как выбрать и не нарваться</h2>
<p>Смотрите реальные фото, уточняйте, что входит в цену, и избегайте предоплат без договора. Актуальные варианты — в разделе <a href="/arenda-batumi">аренда квартир в Батуми</a> или в общем <a href="/catalog?city=%D0%91%D0%B0%D1%82%D1%83%D0%BC%D0%B8">каталоге по Батуми</a>.</p>`,
    },
    en: {
      title: "Renting an apartment in Batumi: prices, districts, long-term and monthly",
      excerpt: "How much it costs to rent in Batumi, how seaside and city districts differ, and how to choose between monthly and long-term rental.",
      body: `
<p>Batumi combines resort and city, so renting here appeals both to tourists and to people relocating long-term. Price depends on proximity to the sea, how new the building is, and its amenities.</p>
<h2>Districts and prices</h2>
<p>The New Boulevard and the seafront first line are the priciest; studios here usually start at $500–800 per month. Further from the sea and in the city it's more affordable. View apartments in new complexes with a pool cost more but rent faster.</p>
<h2>Monthly or yearly</h2>
<p>Long-term rental (12+ months) gives a better monthly price and stability; utilities are paid by the tenant. Monthly is more flexible but pricier. If you're an owner who wants steady income without the hassle, see <a href="/property-management">property management</a> and estimate income in the calculator.</p>
<h2>How to choose safely</h2>
<p>Check real photos, confirm what's included, and avoid prepayments without a contract. See current options in <a href="/arenda-batumi">apartments for rent in Batumi</a> or the full <a href="/catalog?city=%D0%91%D0%B0%D1%82%D1%83%D0%BC%D0%B8">Batumi catalogue</a>.</p>`,
    },
    ka: {
      title: "ბინის ქირაობა ბათუმში: ფასები, უბნები, გრძელვადიანი და თვიური",
      excerpt: "რა ღირს ბინის ქირაობა ბათუმში, რით განსხვავდება ზღვისპირა და ქალაქის უბნები და როგორ ავირჩიოთ თვიურსა და გრძელვადიანს შორის.",
      body: `
<p>ბათუმი აერთიანებს კურორტსა და ქალაქს, ამიტომ ქირაობა აქ საინტერესოა როგორც ტურისტებისთვის, ისე გრძელვადიანად ჩამოსულთათვის. ფასი დამოკიდებულია ზღვასთან სიახლოვეზე, შენობის სიახლესა და ინფრასტრუქტურაზე.</p>
<h2>უბნები და ფასები</h2>
<p>ახალი ბულვარი და ზღვის პირველი ხაზი ყველაზე ძვირია; სტუდიო აქ ჩვეულებრივ თვეში $500–800-დან. ზღვიდან მოშორებით უფრო ხელმისაწვდომია. ხედიანი ბინები აუზიან ახალ კომპლექსებში უფრო ძვირია, მაგრამ სწრაფად ქირავდება.</p>
<h2>თვიური თუ წლიური</h2>
<p>გრძელვადიანი ქირა (12+ თვე) უკეთეს ფასსა და სტაბილურობას იძლევა; კომუნალურს მოიჯარე იხდის. თუ მფლობელი ხართ — იხილეთ <a href="/property-management">ქონების მართვა</a>.</p>
<h2>როგორ ავირჩიოთ უსაფრთხოდ</h2>
<p>იხილეთ რეალური ფოტოები, დააზუსტეთ რა შედის ფასში და მოერიდეთ წინასწარ გადახდას ხელშეკრულების გარეშე. იხილეთ <a href="/arenda-batumi">ბინების ქირა ბათუმში</a> ან <a href="/catalog?city=%D0%91%D0%B0%D1%82%D1%83%D0%BC%D0%B8">კატალოგი</a>.</p>`,
    },
  },
  {
    slug: "pokupka-kvartiry-v-batumi",
    date: "2026-06-19",
    image: "/hero-georgia.webp",
    ru: {
      title: "Как купить квартиру в Батуми: новостройки, цены и оформление сделки",
      excerpt: "Пошагово о покупке квартиры в Батуми: первичка и вторичка, на что смотреть в новостройке, как проходит сделка и оформление для иностранцев.",
      body: `
<p>Батуми — один из главных рынков недвижимости Грузии, где покупают и для жизни, и под инвестицию/сдачу. Иностранцы могут покупать квартиры свободно — это одно из преимуществ рынка.</p>
<h2>Первичка или вторичка</h2>
<p>Новостройки привлекают современными планировками, инфраструктурой (бассейн, спа) и рассрочкой от застройщика; важно проверить стадию готовности и репутацию девелопера. Вторичка — это готовое жильё с понятным состоянием и без рисков долгостроя.</p>
<h2>На что смотреть</h2>
<p>Реальные фото и документы, юридическая чистота, что входит в цену и обслуживание ЖК. По инвестиционной квартире сразу прикиньте доходность от сдачи — особенно если планируете <a href="/property-management">управление под ключ</a>.</p>
<h2>С чего начать</h2>
<p>Определите бюджет и цель (жить или сдавать), затем подбирайте район. Смотрите <a href="/kupit-kvartiru-batumi">квартиры на продажу в Батуми</a> и <a href="/novostroyki-batumi">новостройки</a>. Юридические и налоговые детали стоит финально сверить с местным специалистом.</p>`,
    },
    en: {
      title: "How to buy an apartment in Batumi: new builds, prices and the deal",
      excerpt: "A step-by-step guide to buying in Batumi: new vs resale, what to check in a new building, how the deal works and ownership for foreigners.",
      body: `
<p>Batumi is one of Georgia's main property markets, with buyers purchasing both to live and to invest/rent out. Foreigners can buy apartments freely — one of the market's advantages.</p>
<h2>New build or resale</h2>
<p>New buildings attract with modern layouts, amenities (pool, spa) and developer installment plans; check the construction stage and the developer's reputation. Resale means a ready home with a clear condition and no construction risk.</p>
<h2>What to check</h2>
<p>Real photos and documents, legal cleanliness, what's included in the price and the complex's service. For an investment unit, estimate rental yield in advance — especially if you plan <a href="/property-management">turnkey management</a>.</p>
<h2>Where to start</h2>
<p>Define your budget and goal (live or rent out), then choose a district. Browse <a href="/kupit-kvartiru-batumi">apartments for sale in Batumi</a> and <a href="/novostroyki-batumi">new buildings</a>. Verify legal and tax details with a local specialist.</p>`,
    },
    ka: {
      title: "როგორ ვიყიდოთ ბინა ბათუმში: ახალაშენებები, ფასები და გარიგება",
      excerpt: "ნაბიჯ-ნაბიჯ ბათუმში ბინის ყიდვაზე: ახალი თუ მეორადი, რას მივაქციოთ ყურადღება ახალ შენობაში და უცხოელთა საკუთრება.",
      body: `
<p>ბათუმი საქართველოს ერთ-ერთი მთავარი უძრავი ქონების ბაზარია — ყიდულობენ როგორც საცხოვრებლად, ისე ინვესტიციად. უცხოელებს ბინების ყიდვა თავისუფლად შეუძლიათ — ეს ბაზრის უპირატესობაა.</p>
<h2>ახალი თუ მეორადი</h2>
<p>ახალაშენებები იზიდავს თანამედროვე გეგმარებით, ინფრასტრუქტურით (აუზი, სპა) და განვადებით; შეამოწმეთ მზადყოფნის ეტაპი და დეველოპერის რეპუტაცია. მეორადი — მზა საცხოვრებელია გასაგები მდგომარეობით.</p>
<h2>რას მივაქციოთ ყურადღება</h2>
<p>რეალური ფოტოები და დოკუმენტები, იურიდიული სისუფთავე, რა შედის ფასსა და მომსახურებაში. საინვესტიციო ბინაზე შეაფასეთ შემოსავლიანობა — განსაკუთრებით თუ გეგმავთ <a href="/property-management">მართვას გასაღებზე</a>.</p>
<h2>საიდან დავიწყოთ</h2>
<p>განსაზღვრეთ ბიუჯეტი და მიზანი, შემდეგ აირჩიეთ უბანი. იხილეთ <a href="/kupit-kvartiru-batumi">ბინები გასაყიდად ბათუმში</a> და <a href="/novostroyki-batumi">ახალაშენებები</a>. იურიდიული დეტალები გადაამოწმეთ ადგილობრივ სპეციალისტთან.</p>`,
    },
  },
];

export function getArticle(slug) {
  return ARTICLES.find((a) => a.slug === slug) || null;
}

// Поле статьи на нужном языке с фолбэком на RU.
export function articleField(a, field, lang) {
  return (a[lang] && a[lang][field]) || (a.ru && a.ru[field]) || "";
}
