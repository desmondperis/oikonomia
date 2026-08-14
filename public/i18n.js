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
  'plan.doesNotBalance': ['This plan does not balance', 'यह योजना बराबर नहीं बैठती'],
  'plan.shortfallNote':  ['What you have already committed to comes to more than your income. That is worth looking at together, and it is a gap in income rather than a lapse in discipline.',
                          'जो ख़र्च पहले से तय हैं, वे आपकी आमदनी से ज़्यादा हैं। इसे साथ बैठकर देखना ज़रूरी है — यह आमदनी की कमी है, अनुशासन की नहीं।'],
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
  'plan.tellLead':       ['Tell me what to change, in your own words.', 'अपने शब्दों में बताएँ क्या बदलना है।'],
  'plan.tellPlaceholder':['Increase groceries to 9000', 'राशन 9000 कर दें'],
  'plan.tellAction':     ['Change the plan', 'योजना बदलें'],
  'plan.thinking':       ['One moment…', 'एक पल…'],
  'plan.notUnderstood':  ['I did not follow that. Try naming one thing and one amount — "increase groceries to 9000".',
                          'मैं समझ नहीं पाया। एक चीज़ और एक रकम बताएँ — "राशन 9000 कर दें"।'],
  'plan.noSuchLine':     ['There is no {category} in your plan yet. Add a spend in that category first, or change it by hand below.',
                          'आपकी योजना में अभी {category} नहीं है। पहले उस श्रेणी में कोई खर्च जोड़ें, या नीचे से खुद बदलें।'],
  'plan.changed':        ['{category} is now {amount}.', '{category} अब {amount} है।'],

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
  'more.records':        ['Bank statements', 'बैंक स्टेटमेंट'],
  'more.recordsNote':    ['Oikonomia works from what you record day to day. A statement can fill in the past, but it cannot say what money was for — only you can.',
                          'ओइकोनोमिया उसी से चलता है जो आप रोज़ दर्ज करते हैं। स्टेटमेंट बीता हुआ भर सकता है, पर पैसा किस लिए गया यह नहीं बता सकता — वह सिर्फ़ आप जानते हैं।'],
  'more.uploadStatement':['Upload a bank statement', 'बैंक स्टेटमेंट डालें'],
  'more.uploadNote':     ['PDF, Excel or CSV', 'PDF, Excel या CSV'],
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

  /* ---------- hearing an expense ---------- */
  'voice.private':       ['Voice recognition', 'आवाज़ पहचान'],
  /* Short enough to sit on one line inside its button. The long form wrapped to
     three lines each and turned a menu into a page. */
  'voice.privateNote':   ['Private is slower and downloads 40 MB once.',
                          'निजी वाला धीमा है और एक बार 40 MB उतारता है।'],
  'voice.phone':         ['Instant', 'तुरंत'],
  'voice.onDevice':      ['Private', 'निजी'],
  'voice.downloading':   ['Getting ready… {percent}%', 'तैयार हो रहा है… {percent}%'],
  'voice.thinking':      ['Working out what you said…', 'आपने क्या कहा, समझ रहा हूँ…'],

  /* ---------- the household ---------- */
  'house.signInFirst':   ['Sign in to share this household with your family, so everyone sees the same plan.',
                          'अपने घरवालों के साथ साझा करने के लिए साइन इन करें, ताकि सबको एक ही योजना दिखे।'],
  'house.continueGoogle':['Continue with Google', 'Google से आगे बढ़ें'],
  'house.createOrJoin':  ['Create a household, or join one that somebody has already made.',
                          'अपना घर बनाएँ, या किसी के बनाए घर में जुड़ें।'],
  'house.nameAsk':       ['What shall we call your household?', 'आपके घर को क्या नाम दें?'],
  'house.namePlaceholder':['The Peris family', 'पेरिस परिवार'],
  'house.create':        ['Create our household', 'हमारा घर बनाएँ'],
  'house.orJoin':        ['Or join with a code', 'या कोड से जुड़ें'],
  'house.join':          ['Join that household', 'उस घर में जुड़ें'],
  'house.code':          ['Your household code', 'आपके घर का कोड'],
  'house.codeNote':      ['Share this with your family so they can join. It says nothing about your money.',
                          'इसे घरवालों को दें ताकि वे जुड़ सकें। इससे आपके पैसों का कुछ पता नहीं चलता।'],
  'house.head':          ['head of household', 'घर का मुखिया'],
  'house.viewOnly':      ['can look only', 'सिर्फ़ देख सकते हैं'],
  'house.member':        ['can add and change', 'जोड़ और बदल सकते हैं'],
  'house.deviceOnly':    ['Sign-in is not switched on yet, so Oikonomia is running on this device alone. Everything works — it simply is not shared with anyone else yet.',
                          'साइन-इन अभी चालू नहीं है, इसलिए ओइकोनोमिया सिर्फ़ इसी डिवाइस पर चल रहा है। सब काम करता है — बस अभी किसी के साथ साझा नहीं है।'],

  /* ---------- the plan screen ---------- */
  'plan.makeMine':       ['Make my plan', 'मेरी योजना बनाएँ'],
  'plan.startOverSure':  ['Tap again to rebuild it from your records', 'रिकॉर्ड से दोबारा बनाने के लिए फिर दबाएँ'],
  'plan.principleNote':  ['A principle, not a rule about amounts. What you do with it is yours.',
                          'यह एक सिद्धांत है, रकम का नियम नहीं। इसका क्या करना है, यह आपका फ़ैसला है।'],
  /* Says only what the meter underneath it cannot: which lines are which. The
     old version also promised that recording turns estimates into truth — the
     same sentence the meter's own note makes, two lines further down. */
  'plan.builtFrom':      ['{known} of these are your own figures. {estimated} are Oikonomia’s estimates, marked below.',
                          'इनमें से {known} आपके अपने आँकड़े हैं। {estimated} ओइकोनोमिया के अंदाज़े हैं, नीचे चिह्नित।'],
  'plan.allReal':        ['Every figure here now comes from what your household actually does.',
                          'यहाँ हर आँकड़ा अब आपके घर की असल आदत से आता है।'],

  /* ---------- statements ---------- */
  'st.wasScan':          ['One of these was a scan', 'इनमें से एक स्कैन था'],
  'st.wasScanNote':      ['Reading a picture of a statement is less certain than reading text, so please look these figures over more carefully than usual. The balance check below is the best guide to whether it went well.',
                          'तस्वीर से पढ़ना लिखे हुए से कम भरोसेमंद है, इसलिए इन आँकड़ों को सामान्य से ज़्यादा ध्यान से देखें। नीचे का बैलेंस मिलान सबसे अच्छा संकेत है।'],
  'st.addsUp':           ['These figures add up', 'ये आँकड़े मिल रहे हैं'],
  'st.addsUpNote':       ['Every transaction matches the running balance your bank printed, across {n} checks. Please still look them over.',
                          'हर लेन-देन आपके बैंक के चलते बैलेंस से मेल खाता है, {n} जाँचों में। फिर भी एक नज़र डाल लें।'],
  'st.didNotAddUp':      ['Some rows did not add up', 'कुछ पंक्तियाँ मेल नहीं खाईं'],
  'st.couldNotCheck':    ['I could not check these', 'मैं इन्हें जाँच नहीं सका'],

  /* ---------- said in passing ---------- */
  'toast.cannotSave':    ['Could not save on this device', 'इस डिवाइस पर सहेज नहीं सका'],
  'toast.already':       ['Those transactions are already recorded', 'ये लेन-देन पहले से दर्ज हैं'],
  'toast.added':         ['{n} transactions added', '{n} लेन-देन जोड़े गए'],
  'toast.addedSome':     ['{n} added, {repeated} already recorded', '{n} जोड़े गए, {repeated} पहले से दर्ज'],

  /* ---------- settings ---------- */
  'settings.title':      ['Settings', 'सेटिंग'],
  'settings.close':      ['Close', 'बंद करें'],
  'settings.appearance': ['Appearance', 'दिखावट'],
  'settings.theme':      ['Theme', 'रंग-रूप'],
  'settings.themeNote':  ['Follows your phone unless you choose', 'आपके फ़ोन के अनुसार, जब तक आप न चुनें'],
  'settings.themeSystem':['Auto', 'अपने आप'],
  'settings.themeLight': ['Light', 'हल्का'],
  'settings.themeDark':  ['Dark', 'गहरा'],
  'settings.about':      ['About Oikonomia', 'ओइकोनोमिया के बारे में'],
  'settings.feedback':   ['Send feedback', 'सुझाव भेजें'],
  'settings.feedbackNote':['Tell me what is wrong or missing', 'बताएँ क्या गलत है या क्या कमी है'],
  'settings.account':    ['Account', 'खाता'],
  'settings.signedInAs': ['Signed in as {email}', '{email} से साइन इन'],
  'settings.notSignedIn':['Not signed in. Everything stays on this device.',
                          'साइन इन नहीं हैं। सब कुछ इसी डिवाइस पर रहता है।'],

  /* ---------- getting to know a household ---------- */
  'q.income':            ['How much money comes into your household in a month?',
                          'आपके घर में महीने भर में कितना पैसा आता है?'],
  'q.income.help':       ['Everything together — salary, wages, business, rent received, help from family. If it varies, give a normal month.',
                          'सब मिलाकर — तनख़्वाह, मज़दूरी, धंधा, किराया, घरवालों से मदद। कम-ज़्यादा होता हो तो एक आम महीने का बताएँ।'],
  'q.steady':            ['Does that arrive steadily?', 'क्या वह नियमित रूप से आता है?'],
  'q.steady.help':       ['It changes what kind of cushion makes sense for you.',
                          'इससे तय होता है कि आपके लिए कैसी बचत ठीक रहेगी।'],
  'q.steady.same':       ['The same every month', 'हर महीने एक जैसा'],
  'q.steady.varies':     ['It varies', 'कम-ज़्यादा होता है'],
  'q.steady.irregular':  ['Some months there is little or none', 'कुछ महीने बहुत कम या कुछ नहीं'],

  'q.adults':            ['How many adults live in your household?', 'आपके घर में कितने बड़े लोग हैं?'],
  'q.adults.help':       ['Everyone whose living costs come out of this money.',
                          'वे सब जिनका ख़र्च इसी पैसे से चलता है।'],
  'q.children':          ['And how many children?', 'और कितने बच्चे?'],
  'q.children.help':     ['Leave it blank if none.', 'कोई न हो तो खाली छोड़ दें।'],

  'q.rent':              ['What do you pay for your home each month?', 'घर के लिए हर महीने कितना देते हैं?'],
  'q.rent.help':         ['Rent, or a home loan payment. Skip if you own it outright with nothing to pay.',
                          'किराया, या घर के कर्ज़ की किस्त। अपना घर है और कुछ नहीं देना तो छोड़ दें।'],
  'q.loan':              ['Do you have any loan or EMI payments?', 'कोई कर्ज़ या EMI है?'],
  'q.loan.help':         ['Bank loan, gold loan, vehicle, buy-now-pay-later, or money being repaid to family. Add them together.',
                          'बैंक का कर्ज़, सोने पर कर्ज़, गाड़ी, बाद में चुकाने वाला, या घरवालों को लौटाया जा रहा पैसा। सब जोड़कर बताएँ।'],
  'q.fees':              ['School or college fees?', 'स्कूल या कॉलेज की फ़ीस?'],
  'q.fees.help':         ['Give the yearly amount and Oikonomia will set aside a twelfth each month, so the term bill does not arrive as a shock.',
                          'साल भर की रकम बताएँ; ओइकोनोमिया हर महीने बारहवाँ हिस्सा अलग रखेगा, ताकि फ़ीस अचानक बोझ न बने।'],
  'q.insurance':         ['Insurance premiums?', 'बीमा की किस्त?'],
  'q.insurance.help':    ['Life, health or vehicle, for the whole year. Skip if you have none — Oikonomia will mention it later.',
                          'जीवन, सेहत या गाड़ी का, पूरे साल का। न हो तो छोड़ दें — ओइकोनोमिया बाद में याद दिलाएगा।'],

  'q.travel':            ['How does your household usually get about?', 'आपके घर के लोग आम तौर पर कैसे आते-जाते हैं?'],
  'q.travel.help':       ['This shapes what Oikonomia expects travel to cost.',
                          'इससे तय होता है कि आने-जाने का ख़र्च कितना माना जाए।'],
  'q.travel.walk':       ['Mostly walking or cycling', 'ज़्यादातर पैदल या साइकिल'],
  'q.travel.public':     ['Bus, train or shared auto', 'बस, ट्रेन या शेयर ऑटो'],
  'q.travel.twowheeler': ['A two-wheeler', 'दोपहिया गाड़ी'],
  'q.travel.car':        ['A car', 'कार'],

  'q.giving':            ['Do you set anything aside for giving?', 'क्या आप दान के लिए कुछ अलग रखते हैं?'],
  'q.giving.help':       ['Church, charity, helping family or neighbours. This is entirely yours to decide — Oikonomia only makes room for whatever you choose.',
                          'चर्च, दान, घरवालों या पड़ोसियों की मदद। यह पूरी तरह आपका फ़ैसला है — ओइकोनोमिया बस उसके लिए जगह बनाता है।'],
  'q.giving.tenth':      ['A tenth of what comes in', 'आमदनी का दसवाँ हिस्सा'],
  'q.giving.twentieth':  ['Around a twentieth', 'लगभग बीसवाँ हिस्सा'],
  'q.giving.other':      ['Something else — I will set it myself', 'कुछ और — मैं ख़ुद तय करूँगा'],
  'q.giving.none':       ['Not at the moment', 'अभी नहीं'],

  'q.shortfall':         ['Be honest — how do most months end?', 'सच बताइए — ज़्यादातर महीने कैसे ख़त्म होते हैं?'],
  'q.shortfall.help':    ['Nobody sees this but you. It changes what Oikonomia suggests first.',
                          'यह आपके सिवा कोई नहीं देखता। इससे तय होता है कि ओइकोनोमिया पहले क्या सुझाए।'],
  'q.shortfall.ok':      ['There is usually something left', 'आम तौर पर कुछ बच जाता है'],
  'q.shortfall.tight':   ['It is tight but it works out', 'तंगी रहती है पर काम चल जाता है'],
  'q.shortfall.short':   ['I often run out before the month does', 'महीना ख़त्म होने से पहले पैसे ख़त्म हो जाते हैं'],
  'q.shortfall.borrow':  ['I usually have to borrow', 'आम तौर पर उधार लेना पड़ता है'],

  'q.goal':              ['What would you most like money to do for you?', 'आप पैसे से सबसे पहले क्या करना चाहेंगे?'],
  'q.goal.help':         ['Oikonomia will work towards this once the essentials are steady.',
                          'ज़रूरी ख़र्च संभल जाने पर ओइकोनोमिया इसी की ओर बढ़ेगा।'],
  'q.goal.cushion':      ['Stop living so close to the edge', 'हाथ तंग रहना बंद हो'],
  'q.goal.debt':         ['Get out of debt', 'कर्ज़ से छूट जाऊँ'],
  'q.goal.school':       ["Pay for children's education", 'बच्चों की पढ़ाई का इंतज़ाम'],
  'q.goal.home':         ['A home of our own', 'अपना घर'],
  'q.goal.family':       ['Help family who need it', 'ज़रूरतमंद घरवालों की मदद'],
  'q.goal.later':        ['Something for later life', 'बुढ़ापे के लिए कुछ'],

  'survey.monthly':      ['Amount each month', 'हर महीने की रकम'],
  'survey.yearly':       ['Amount for the whole year', 'पूरे साल की रकम'],
  'survey.howMany':      ['How many', 'कितने'],
  'survey.needed':       ['Oikonomia cannot plan without this one. A rough figure is fine.',
                          'इसके बिना योजना नहीं बन सकती। अंदाज़न रकम भी चलेगी।'],
  'survey.notANumber':   ['Please enter a number.', 'कृपया कोई संख्या भरें।'],
  'survey.dontHave':     ['I do not have this', 'मेरे पास यह नहीं है'],
  'survey.next':         ['Next', 'आगे'],
  'survey.finish':       ['Finish', 'पूरा करें'],
  'survey.back':         ['Back', 'पीछे'],
  'survey.done':         ['That is all Oikonomia needs', 'ओइकोनोमिया को बस इतना ही चाहिए'],
  'survey.doneHelp':     ['It will not ask what you spend on food or travel, because most households have never counted and a guess would only mislead you. Oikonomia will put a starting figure against those, clearly marked as its own estimate. What you actually record this month is what turns them into the truth — and seeing that is the point.',
                          'यह नहीं पूछेगा कि खाने या आने-जाने पर कितना ख़र्च होता है, क्योंकि ज़्यादातर घरों ने कभी गिना ही नहीं, और अंदाज़ा भटका देगा। ओइकोनोमिया वहाँ अपनी ओर से एक शुरुआती रकम रखेगा और साफ़ बताएगा कि वह अंदाज़ा है। इस महीने आप जो सचमुच दर्ज करेंगे, वही उसे सच में बदलेगा — और यही देखना असली बात है।'],
  'survey.commitments':  ['Fixed commitments', 'तय ख़र्च'],
  'survey.leftToPlan':   ['Left to plan with', 'योजना के लिए बचा'],
  'survey.build':        ['Build my plan', 'मेरी योजना बनाएँ'],
  'survey.changeAnswers':['Change my answers', 'मेरे जवाब बदलें'],
  'survey.stillGuess':   ['still a guess', 'अभी अंदाज़ा'],
  'survey.knownNote':    ['{percent}% of your plan is real so far. Recording what you spend turns the rest real.',
                          'अभी आपकी योजना का {percent}% सच है। जो ख़र्च करते हैं वह दर्ज करने से बाकी भी सच हो जाएगा।'],

  /* ---------- how the month is going ---------- */
  'pace.early':          ['Just started', 'अभी शुरू'],
  'pace.early.note':     ['this month', 'इस महीने'],
  /* Not 'Careful' — on its own that word is an imperative, and it read as a
     warning sitting directly above 'well within plan'. */
  'pace.careful':        ['Comfortable', 'आराम से'],
  'pace.careful.note':   ['well within plan', 'योजना से काफ़ी कम'],
  'pace.onTrack':        ['On track', 'ठीक चल रहा'],
  'pace.onTrack.note':   ['about right for the day', 'तारीख़ के हिसाब से ठीक'],
  'pace.quick':          ['Going quickly', 'तेज़ी से ख़र्च'],
  'pace.quick.note':     ['ahead of the plan', 'योजना से आगे'],
  'pace.over':           ['Well ahead', 'योजना से काफ़ी आगे'],
  'pace.over.note':      ['of what was planned', 'जितना तय था उससे'],
  'progress.streak':     ['day streak', 'दिन लगातार'],
  'progress.points':     ['points', 'अंक'],
  'progress.recorded':   ['recorded this month', 'इस महीने दर्ज'],
  'progress.day':        ['Written down for today', 'आज का दर्ज हो गया'],
  'progress.streakDays': ['{n} days in a row', 'लगातार {n} दिन'],
  'progress.discovery':  ['You now know what {category} really costs you',
                          'अब आप जानते हैं कि {category} पर असल में कितना जाता है'],

  /* ---------- stewardship principles ----------
     The plain-language line beside each is translated. The passages themselves
     are not: putting Scripture into Hindi is a translator's work, not a
     programmer's, so in Hindi the reference is given and the household reads it
     in their own Bible. */
  'pr.ownership':        ['What we hold, we hold in trust', 'जो हमारे पास है, वह धरोहर है'],
  'pr.ownership.says':   ['Money is something to handle faithfully, not a measure of who you are.',
                          'पैसा ईमानदारी से संभालने की चीज़ है, आपकी पहचान का पैमाना नहीं।'],
  'pr.provision':        ['Providing for your household comes first', 'अपने घर का इंतज़ाम पहले'],
  'pr.provision.says':   ['Food, a roof, power, medicine and getting to work are protected before anything else.',
                          'खाना, छत, बिजली, दवा और काम पर पहुँचना — ये सबसे पहले सुरक्षित रहते हैं।'],
  'pr.planning':         ['Counting the cost before you begin', 'शुरू करने से पहले हिसाब लगाना'],
  'pr.planning.says':    ['Knowing what is coming — school fees, an insurance premium, a festival — is most of the work.',
                          'क्या आने वाला है यह जान लेना — फ़ीस, बीमा की किस्त, त्योहार — आधा काम वहीं हो जाता है।'],
  'pr.debt':             ['Debt narrows what you can choose', 'कर्ज़ आपके विकल्प घटा देता है'],
  'pr.debt.says':        ['Not all debt is alike. A high-interest loan costs your household far more than a home loan does.',
                          'हर कर्ज़ एक जैसा नहीं होता। ऊँचे ब्याज़ वाला कर्ज़ घर पर घर के कर्ज़ से कहीं ज़्यादा भारी पड़ता है।'],
  'pr.preparedness':     ['Setting something aside before it is needed', 'ज़रूरत से पहले कुछ अलग रखना'],
  'pr.preparedness.says':['A cushion of even a few thousand rupees changes what a broken phone or a fever means.',
                          'कुछ हज़ार रुपये की बचत भी टूटे फ़ोन या बुख़ार के मायने बदल देती है।'],
  'pr.contentment':      ['Enough is a real place', 'पर्याप्त भी एक ठिकाना है'],
  'pr.contentment.says': ['Spending tends to rise quietly with income. Noticing it is not the same as denying yourself.',
                          'आमदनी बढ़ने के साथ ख़र्च चुपचाप बढ़ता जाता है। उसे देख लेना अपने को तरसाना नहीं है।'],
  'pr.generosity':       ['Giving belongs in the plan', 'दान भी योजना का हिस्सा है'],
  'pr.generosity.says':  ['What you give, and to whom, is yours to decide. Oikonomia only makes room for it.',
                          'क्या देना है और किसे, यह आपका फ़ैसला है। ओइकोनोमिया बस उसके लिए जगह बनाता है।'],
  'pr.work':             ['Budgeting is not only about spending less', 'बजट सिर्फ़ कम ख़र्च करने का नाम नहीं'],
  'pr.work.says':        ['When a budget will not balance however carefully it is cut, the constraint is income, not discipline.',
                          'जब कितना भी काटने पर बजट न बैठे, तो दिक़्क़त आमदनी की है, अनुशासन की नहीं।'],
  'pr.readIt':           ['Read it in your own Bible', 'अपनी बाइबल में पढ़ें'],

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
