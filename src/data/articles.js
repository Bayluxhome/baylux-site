// Статьи блога Baylux. Статичный контент в репозитории (без БД — не грузит Supabase).
// Каждая статья: slug, дата, обложка (из /public) + title/excerpt/body на 3 языках (ru/en/ka).
// body — HTML-строка (рендерится через dangerouslySetInnerHTML в стилизованном контейнере).
// Цель — низкоконкурентные/информационные запросы + внутренние ссылки на каталог и лендинги.

export const ARTICLES = [
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
];

export function getArticle(slug) {
  return ARTICLES.find((a) => a.slug === slug) || null;
}

// Поле статьи на нужном языке с фолбэком на RU.
export function articleField(a, field, lang) {
  return (a[lang] && a[lang][field]) || (a.ru && a.ru[field]) || "";
}
