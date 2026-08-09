/* The words Oikonomia uses.
 *
 * Everything a household reads lives here, in both languages, so choosing
 * हिन्दी changes the whole app rather than only what the microphone listens for.
 *
 * The Hindi is written the way people actually speak about money — बजट, खर्च,
 * किराया — rather than in the formal register of a bank letter. Where an
 * everyday word is an English loanword, that is what is used, because it is
 * what a household would say out loud.
 */

const STORE = 'oikonomia.language.v1';

export const LANGUAGES = [
  { code: 'en-IN', name: 'English', short: 'en' },
  { code: 'hi-IN', name: 'हिन्दी', short: 'hi' }
];

const WORDS = {
  /* ---------- the frame ---------- */
  'app.name':            ['Oikonomia', 'ओइकोनोमिया'],
  'tab.home':            ['Home', 'घर'],
  'tab.plan':            ['Plan', 'योजना'],
  'tab.ask':             ['Ask', 'पूछें'],
  'tab.more':            ['More', 'और'],
  'tab.add':             ['Add expense', 'खर्च जोड़ें'],

  /* ---------- first run ---------- */
  'welcome.title':       ['Which language would you like?', 'आप कौन सी भाषा चाहेंगे?'],
  'welcome.note':        ['This changes the whole app, and how it listens when you speak. You can change it any time.',
                          'इससे पूरा ऐप बदल जाएगा, और बोलने पर यह कैसे सुनता है वह भी। आप इसे कभी भी बदल सकते हैं।'],

  /* ---------- home ---------- */
  'home.spent':          ['Spent this month', 'इस महीने खर्च'],
  'home.left':           ['Left for this month', 'इस महीने के लिए बचा'],
  'home.over':           ['Over your plan by', 'योजना से ज़्यादा'],
  'home.nothing':        ['Nothing recorded yet.', 'अभी कुछ दर्ज नहीं हुआ।'],
  'home.entries':        ['{n} entries so far this month.', 'इस महीने अब तक {n} प्रविष्टियाँ।'],
  'home.entry':          ['{n} entry so far this month.', 'इस महीने अब तक {n} प्रविष्टि।'],
  'home.daysLeft':       ['{n} days left in the month', 'महीने में {n} दिन बाकी'],
  'home.daysLeftOver':   ['{n} days left · {c} over', '{n} दिन बाकी · {c} सीमा से ऊपर'],
  'home.checkPlan':      ['Worth a look at your plan.', 'अपनी योजना देख लेना ठीक रहेगा।'],
  'home.spentShort':     ['Spent', 'खर्च'],
  'home.thisMonth':      ['This month', 'इस महीने'],
  'home.recent':         ['Recent', 'हाल का'],
  'home.recentEmpty':    ['Anything you add will appear here.', 'आप जो भी जोड़ेंगे वह यहाँ दिखेगा।'],
  'home.nextStep':       ['Next step', 'अगला कदम'],
  'home.left.suffix':    ['{amount} left', '{amount} बचा'],
  'home.over.suffix':    ['{amount} over', '{amount} ज़्यादा'],
  'home.morning':        ['Good morning', 'सुप्रभात'],
  'home.afternoon':      ['Good afternoon', 'नमस्कार'],
  'home.evening':        ['Good evening', 'शुभ संध्या'],

  /* ---------- next steps ---------- */
  'next.noRecords':      ['Oikonomia has nothing to go on yet. Upload a few months of bank statements, or simply tell it about your household.',
                          'ओइकोनोमिया के पास अभी कुछ नहीं है। कुछ महीनों के बैंक स्टेटमेंट डालें, या बस अपने घर के बारे में बता दें।'],
  'next.noRecords.do':   ['Add a bank statement', 'बैंक स्टेटमेंट जोड़ें'],
  'next.noPlan':         ['You have records but no plan yet. A plan turns "what did we spend" into "what have we still got".',
                          'आपके पास रिकॉर्ड हैं पर योजना नहीं। योजना से पता चलता है कि "कितना खर्च हुआ" नहीं, बल्कि "अब कितना बचा है"।'],
  'next.noPlan.do':      ['Make my plan', 'मेरी योजना बनाएँ'],
  'next.noKey':          ['Adding an assistant key lets Oikonomia sort unfamiliar shops and answer questions in plain words. It is free, and takes about two minutes.',
                          'सहायक की चाबी जोड़ने पर ओइकोनोमिया अनजान दुकानों को पहचान लेगा और सवालों के जवाब आसान शब्दों में देगा। यह मुफ़्त है, और दो मिनट लगते हैं।'],
  'next.noKey.do':       ['Set up the assistant', 'सहायक तैयार करें'],

  /* ---------- adding an expense ---------- */
  'add.title':           ['Add expense', 'खर्च जोड़ें'],
  'add.edit':            ['Edit expense', 'खर्च बदलें'],
  'add.howMuch':         ['How much?', 'कितना?'],
  'add.whatWas':         ['What was it?', 'किस चीज़ का?'],
  'add.placeholder':     ['Milk, cab, school books…', 'दूध, ऑटो, स्कूल की किताबें…'],
  'add.save':            ['Save', 'सहेजें'],
  'add.saveChanges':     ['Save changes', 'बदलाव सहेजें'],
  'add.cancel':          ['Cancel', 'रद्द करें'],
  'add.remove':          ['Remove this expense', 'यह खर्च हटाएँ'],
  'add.removeConfirm':   ['Tap again to remove it', 'हटाने के लिए फिर दबाएँ'],
  'add.speak':           ['Say it instead', 'बोलकर बताएँ'],
  'add.listening':       ['Listening… tap to stop', 'सुन रहा हूँ… रोकने के लिए दबाएँ'],
  'add.orType':          ['or type it', 'या लिखें'],
  'add.speakingIn':      ['Speaking in', 'बोल रहे हैं'],
  'add.needAmount':      ['Please enter an amount, like 250.', 'कृपया रकम भरें, जैसे 250।'],
  'add.cannotSave':      ['Could not save on this device. Please try again.', 'इस डिवाइस पर सहेज नहीं सका। फिर कोशिश करें।'],
  'add.added':           ['{amount} added', '{amount} जोड़ा गया'],
  'add.updated':         ['Updated', 'बदल दिया'],
  'add.removed':         ['Removed', 'हटा दिया'],

  /* ---------- the plan ---------- */
  'plan.title':          ['Your plan', 'आपकी योजना'],
  'plan.understood':     ["Here's what I understood", 'मैंने यह समझा है'],
  'plan.forMonth':       ['Your plan for {month}', '{month} की आपकी योजना'],
  'plan.income':         ['Money coming in', 'आने वाला पैसा'],
  'plan.essential':      ['Things you must pay', 'जो चुकाना ज़रूरी है'],
  'plan.flexible':       ['Everything else', 'बाकी सब'],
  'plan.leftOver':       ['Left over', 'बचा हुआ'],
  'plan.shortBy':        ['Short by', 'कम पड़ रहा'],
  'plan.planned':        ['Planned', 'तय किया'],
  'plan.spentSoFar':     ['Spent so far', 'अब तक खर्च'],
  'plan.stillToSpend':   ['Still to spend', 'अभी खर्च करना बाकी'],
  'plan.tapAny':         ['Tap any line to see why it is set there, and to change it.',
                          'किसी भी पंक्ति को दबाकर देखें कि वह रकम क्यों है, और उसे बदलें।'],
  'plan.everyMonth':     ['every month', 'हर महीने'],
  'plan.change':         ['Change', 'बदलें'],
  'plan.startAgain':     ['Start the plan again', 'योजना दोबारा बनाएँ'],
  'plan.startAgain.sure':['Tap again to rebuild it from your records', 'रिकॉर्ड से दोबारा बनाने के लिए फिर दबाएँ'],
  'plan.tellUs':         ['Tell Oikonomia about your household', 'ओइकोनोमिया को अपने घर के बारे में बताएँ'],
  'plan.tellUsAgain':    ['Tell Oikonomia about your household again', 'अपने घर के बारे में दोबारा बताएँ'],
  'plan.nothingYet':     ['Nothing to go on yet. Oikonomia can learn your household from bank statements — or you can simply tell it, which takes about two minutes.',
                          'अभी कुछ नहीं है। ओइकोनोमिया बैंक स्टेटमेंट से आपके घर को समझ सकता है — या आप बस बता दें, दो मिनट लगेंगे।'],

  /* ---------- asking ---------- */
  'ask.title':           ['Ask Oikonomia', 'ओइकोनोमिया से पूछें'],
  'ask.placeholder':     ['How are we doing this month?', 'इस महीने हम कैसे चल रहे हैं?'],
  'ask.opening':         ['Ask me anything about your household’s money. I answer from your own records — I never guess at a number.',
                          'अपने घर के पैसों के बारे में कुछ भी पूछें। मैं आपके अपने रिकॉर्ड से जवाब देता हूँ — कोई आँकड़ा अंदाज़े से नहीं बताता।'],
  'ask.suggest1':        ['How are we doing this month?', 'इस महीने हम कैसे चल रहे हैं?'],
  'ask.suggest2':        ['Where is our money going?', 'हमारा पैसा कहाँ जा रहा है?'],
  'ask.suggest3':        ['What can I still spend?', 'मैं अभी और कितना खर्च कर सकता हूँ?'],
  'ask.suggest4':        ['Can we afford ₹5,000 this week?', 'क्या इस हफ़्ते ₹5,000 खर्च कर सकते हैं?'],

  /* ---------- statements ---------- */
  'records.title':       ['Bank statements', 'बैंक स्टेटमेंट'],
  'records.lead':        ["Upload your statements and I'll read them for you. You can choose as many as you like at once — every account, every month. They stay on your phone and are never sent anywhere.",
                          'अपने स्टेटमेंट डालें, मैं पढ़ लूँगा। एक साथ जितने चाहें चुन सकते हैं — हर खाता, हर महीना। ये आपके फ़ोन पर ही रहते हैं, कहीं नहीं भेजे जाते।'],
  'records.prefer':      ['If your bank offers Excel or CSV from net banking, choose that over PDF. It reads instantly and is far less likely to be misread.',
                          'अगर आपका बैंक नेट बैंकिंग से Excel या CSV देता है, तो PDF की जगह वही चुनें। वह तुरंत पढ़ा जाता है और गलती की गुंजाइश बहुत कम रहती है।'],
  'records.choose':      ['Choose statements', 'स्टेटमेंट चुनें'],
  'records.formats':     ['PDF, Excel or CSV, from any Indian bank', 'PDF, Excel या CSV — किसी भी भारतीय बैंक का'],
  'records.password':    ['This statement is password protected. Enter the password to open it.',
                          'यह स्टेटमेंट पासवर्ड से सुरक्षित है। खोलने के लिए पासवर्ड डालें।'],
  'records.passwordNote':['The password is used here on your phone and then forgotten. It is not saved and not sent anywhere.',
                          'पासवर्ड यहीं आपके फ़ोन पर इस्तेमाल होकर भूल जाया जाता है। न सहेजा जाता है, न कहीं भेजा जाता है।'],
  'records.passwordLabel':['Password', 'पासवर्ड'],
  'records.open':        ['Open statement', 'स्टेटमेंट खोलें'],
  'records.skip':        ['Skip this one', 'इसे छोड़ दें'],
  'records.reading':     ['Reading your statements…', 'आपके स्टेटमेंट पढ़ रहा हूँ…'],
  'records.tryAnother':  ['Try another file', 'दूसरी फ़ाइल आज़माएँ'],

  /* ---------- more ---------- */
  'more.title':          ['More', 'और'],
  'more.household':      ['Your household', 'आपका घर'],
  'more.assistant':      ['The assistant', 'सहायक'],
  'more.assistantName':  ["Oikonomia's assistant", 'ओइकोनोमिया का सहायक'],
  'more.notSetUp':       ['Not set up yet', 'अभी तैयार नहीं'],
  'more.connected':      ['Connected · key ending {last4}', 'जुड़ा हुआ · चाबी का अंत {last4}'],
  'more.preferences':    ['Preferences', 'पसंद'],
  'more.language':       ['Language', 'भाषा'],
  'more.languageNote':   ['Changes the whole app, and how it listens when you speak',
                          'पूरा ऐप बदलता है, और बोलने पर यह कैसे सुनता है वह भी'],
  'more.yourData':       ['Your data', 'आपका डेटा'],
  'more.erase':          ['Erase everything on this device', 'इस डिवाइस से सब कुछ मिटाएँ'],
  'more.eraseNote':      ['Records, plan, categories and key', 'रिकॉर्ड, योजना, श्रेणियाँ और चाबी'],
  'more.eraseConfirm':   ['Tap again to erase everything', 'सब मिटाने के लिए फिर दबाएँ'],
  'more.eraseWarn':      ['This cannot be undone', 'यह वापस नहीं होगा'],
  'more.erased':         ['Everything erased', 'सब मिटा दिया'],
  'more.signOut':        ['Sign out', 'साइन आउट'],
  'more.keyLabel':       ['Your OpenRouter key', 'आपकी OpenRouter चाबी'],
  'more.saveTest':       ['Save and test', 'सहेजें और जाँचें'],
  'more.removeKey':      ['Remove key', 'चाबी हटाएँ'],
  'more.about':          ['About', 'परिचय'],
  'more.privacy':        ['Privacy', 'निजता'],
  'more.terms':          ['Terms', 'शर्तें'],
  'more.contact':        ['Contact', 'संपर्क'],

  /* ---------- sharing with the household ---------- */
  'sync.brought':        ['{n} new from your household', 'आपके घर से {n} नए'],
  'sync.title':          ['Share with your household', 'अपने घर के साथ साझा करें'],
  'sync.phraseTitle':    ['Write these twelve words down', 'ये बारह शब्द लिख लें'],
  'sync.phraseWhy':      ['These words are the only key to your household\'s records. Everything is locked with them before it leaves your phone, which is why nobody who runs Oikonomia can read your money — and why nobody can get it back for you if these are lost.',
                          'ये शब्द ही आपके घर के रिकॉर्ड की एकमात्र चाबी हैं। फ़ोन से बाहर जाने से पहले सब कुछ इन्हीं से बंद होता है — इसीलिए ओइकोनोमिया चलाने वाला भी आपका हिसाब नहीं पढ़ सकता, और इसीलिए ये खो जाएँ तो कोई वापस नहीं दिला सकता।'],
  'sync.phraseHow':      ['Write them on paper and keep it somewhere private. Not in your phone\'s notes, not in a message to yourself.',
                          'इन्हें कागज़ पर लिखकर किसी निजी जगह रखें। न फ़ोन के नोट्स में, न अपने ही मैसेज में।'],
  'sync.phraseConfirm':  ['I have written these down and stored them safely',
                          'मैंने इन्हें लिखकर सुरक्षित रख लिया है'],
  'sync.phraseDone':     ['Done', 'हो गया'],
  'sync.enterTitle':     ['Enter your household\'s twelve words', 'अपने घर के बारह शब्द डालें'],
  'sync.enterWhy':       ['Ask whoever set up your household for the twelve words. Without them this phone cannot read the household\'s records.',
                          'जिसने घर बनाया है उनसे बारह शब्द माँगें। इनके बिना यह फ़ोन घर के रिकॉर्ड नहीं पढ़ सकता।'],
  'sync.enterAction':    ['Unlock this household', 'यह घर खोलें'],
  'sync.wrongPhrase':    ['Those words do not open this household. Check them and try again.',
                          'ये शब्द इस घर को नहीं खोलते। जाँच कर फिर कोशिश करें।'],
  'sync.badWords':       ['These are not words Oikonomia uses: {words}', 'ये शब्द ओइकोनोमिया के नहीं हैं: {words}'],
  'sync.needTwelve':     ['That should be twelve words.', 'बारह शब्द होने चाहिए।'],
  'sync.ready':          ['This phone is now sharing with your household.', 'यह फ़ोन अब आपके घर के साथ साझा कर रहा है।'],
  'sync.showPhrase':     ['Show my twelve words', 'मेरे बारह शब्द दिखाएँ'],
  'sync.status':         ['Sharing with your household', 'आपके घर के साथ साझा'],
  'sync.notSharing':     ['Only on this phone', 'सिर्फ़ इस फ़ोन पर'],

  /* ---------- settings ---------- */
  'settings.title':      ['Settings', 'सेटिंग'],
  'settings.close':      ['Close', 'बंद करें'],
  'settings.appearance': ['Appearance', 'दिखावट'],
  'settings.theme':      ['Theme', 'रंग-रूप'],
  'settings.themeNote':  ['Follows your phone unless you choose', 'आपके फ़ोन के अनुसार, जब तक आप न चुनें'],
  'settings.themeSystem':["Your phone's setting", 'फ़ोन की सेटिंग'],
  'settings.themeLight': ['Light', 'हल्का'],
  'settings.themeDark':  ['Dark', 'गहरा'],
  'settings.about':      ['About Oikonomia', 'ओइकोनोमिया के बारे में'],
  'settings.feedback':   ['Send feedback', 'सुझाव भेजें'],
  'settings.feedbackNote':['Tell me what is wrong or missing', 'बताएँ क्या गलत है या क्या कमी है'],
  'settings.account':    ['Account', 'खाता'],
  'settings.signedInAs': ['Signed in as {email}', '{email} से साइन इन'],
  'settings.notSignedIn':['Not signed in. Everything stays on this device.',
                          'साइन इन नहीं हैं। सब कुछ इसी डिवाइस पर रहता है।'],

  /* ---------- categories ---------- */
  'cat.Rent':                  ['Rent', 'किराया'],
  'cat.Groceries':             ['Groceries', 'राशन'],
  'cat.Bills':                 ['Bills', 'बिल'],
  'cat.Health':                ['Health', 'सेहत'],
  'cat.Education':             ['Education', 'पढ़ाई'],
  'cat.Transport':             ['Transport', 'आना-जाना'],
  'cat.Insurance':             ['Insurance', 'बीमा'],
  'cat.Loan payment':          ['Loan payment', 'कर्ज़ की किस्त'],
  'cat.Giving':                ['Giving', 'दान'],
  'cat.Savings and investing': ['Savings and investing', 'बचत और निवेश'],
  'cat.Eating out':            ['Eating out', 'बाहर खाना'],
  'cat.Shopping':              ['Shopping', 'खरीदारी'],
  'cat.Subscriptions':         ['Subscriptions', 'सदस्यताएँ'],
  'cat.Cash withdrawn':        ['Cash withdrawn', 'नकद निकाला'],
  'cat.Other':                 ['Other', 'अन्य'],
  'cat.Income':                ['Income', 'आमदनी']
};

/* ---------- which language ---------- */

function deviceLanguage() {
  const tags = [navigator.language, ...(navigator.languages || [])];
  for (const tag of tags) {
    if (String(tag).toLowerCase().startsWith('hi')) return 'hi-IN';
  }
  return 'en-IN';
}

export function savedLanguage() {
  try {
    const saved = localStorage.getItem(STORE);
    if (saved && LANGUAGES.some((item) => item.code === saved)) return saved;
  } catch { /* storage unavailable */ }
  return null;
}

let current = savedLanguage() || deviceLanguage();

export function getLanguage() {
  return current;
}

export function setLanguage(code) {
  current = LANGUAGES.some((item) => item.code === code) ? code : 'en-IN';
  try { localStorage.setItem(STORE, current); } catch { /* fine */ }
  document.documentElement.lang = current.slice(0, 2);
  applyTo(document);
  return current;
}

export function suggestedLanguage() {
  return deviceLanguage();
}

/* ---------- the words themselves ---------- */

/**
 * Look up a phrase, filling in any values it needs.
 *
 * An unknown key returns itself rather than an empty space, so a missing
 * translation is visible to whoever is testing instead of silently blank.
 */
export function t(key, values = {}) {
  const entry = WORDS[key];
  const index = current.startsWith('hi') ? 1 : 0;

  let text = entry ? (entry[index] || entry[0]) : key;

  for (const [name, value] of Object.entries(values)) {
    text = text.replaceAll(`{${name}}`, String(value));
  }

  return text;
}

/** A category name in the household's own language. */
export function categoryName(id) {
  return t(`cat.${id}`);
}

/**
 * Put the right words into a page.
 *
 * Elements carry data-i18n for their text, and data-i18n-placeholder or
 * data-i18n-aria where the words belong to an attribute instead.
 */
export function applyTo(scope = document) {
  for (const node of scope.querySelectorAll('[data-i18n]')) {
    node.textContent = t(node.dataset.i18n);
  }
  for (const node of scope.querySelectorAll('[data-i18n-placeholder]')) {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  }
  for (const node of scope.querySelectorAll('[data-i18n-aria]')) {
    node.setAttribute('aria-label', t(node.dataset.i18nAria));
  }
}
