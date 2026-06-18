import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// the translations
// (tip move them in a JSON file and import them,
// or even better, manage them separated from your code: https://react.i18next.com/guides/multiple-translation-files)
const resources = {
  en: {
    translation: {
      nav: {
        home: "Home",
        impact: "Impact",
        map: "Map",
        admin: "Admin",
      },
      home: {
        title: "Report civic issues instantly. Make your community better.",
        subtitle: `${import.meta.env.VITE_APP_NAME || "LocalVoice"} is the fastest way to report potholes, broken streetlights, and garbage dumps directly to the authorities.`,
        reportBtn: "Report an Issue",
        viewMapBtn: "View Live Map",
      },
      form: {
        category: "Issue category",
        location: "Location",
        detectLocation: "Check for Auto-Location",
        detectingLocation: "Detecting Location...",
        orEnterManually: "OR ENTER MANUALLY",
        streetPlaceholder: "Street / Area Name *",
        landmarkPlaceholder: "Landmark (optional)",
        pincodePlaceholder: "Pincode",
        useDetected: "Use detected location",
        editManually: "Edit manually",
        adjustOnMap: "Adjust on map",
        describeIssue: "Describe the issue",
        descPlaceholder: "e.g. Streetlight on MG Road near the bus stop has been out for 3 days",
        charsLeft: "characters left",
        photoOptional: "Photo (optional)",
        tapToUpload: "Tap to take a photo or upload",
        uploading: "Uploading...",
        saving: "Saving...",
        failed: "Failed — try again",
        submit: "Submit report",
        dailyLimit: "Daily Limit Reached",
        dailyLimitDesc: "You have submitted the maximum of 3 reports for today. Thank you for your civic engagement! Please come back tomorrow to submit more.",
        successMsg: "Report submitted — thank you!",
        trackingToken: "Your tracking token:",
        saveToken: "Save this token to check your complaint status.",
        submitAnother: "Submit another report",
      },
      categories: {
        streetlight: "Streetlight",
        water: "Water",
        garbage: "Garbage",
        roads: "Roads",
        drainage: "Drainage",
        electricity: "Electricity",
        encroachment: "Encroachment",
        publictoilet: "Public Toilet",
        park: "Park / Garden",
        other: "Other",
      }
    }
  },
  te: {
    translation: {
      nav: {
        home: "హోమ్ (Home)",
        impact: "ప్రభావం (Impact)",
        map: "మ్యాప్ (Map)",
        admin: "అడ్మిన్ (Admin)",
      },
      home: {
        title: "పౌర సమస్యలను తక్షణమే నివేదించండి. మీ సమాజాన్ని మెరుగుపరచండి.",
        subtitle: `గుంతలు, వీధి దీపాలు మరియు చెత్త కుప్పల సమస్యలను అధికారులకు నేరుగా నివేదించడానికి ${import.meta.env.VITE_APP_NAME || "LocalVoice"} వేగవంతమైన మార్గం.`,
        reportBtn: "సమస్యను నివేదించండి",
        viewMapBtn: "లైవ్ మ్యాప్ చూడండి",
      },
      form: {
        category: "సమస్య వర్గం (Category)",
        location: "స్థానం (Location)",
        detectLocation: "ఆటో-లొకేషన్ కోసం తనిఖీ చేయండి",
        detectingLocation: "లొకేషన్ గుర్తిస్తోంది...",
        orEnterManually: "లేదా మాన్యువల్‌గా నమోదు చేయండి",
        streetPlaceholder: "వీధి / ప్రాంతం పేరు *",
        landmarkPlaceholder: "ల్యాండ్‌మార్క్ (ఐచ్ఛికం)",
        pincodePlaceholder: "పిన్‌కోడ్",
        useDetected: "గుర్తించిన స్థానాన్ని ఉపయోగించండి",
        editManually: "మాన్యువల్‌గా సవరించండి",
        adjustOnMap: "మ్యాప్‌లో సర్దుబాటు చేయండి",
        describeIssue: "సమస్యను వివరించండి",
        descPlaceholder: "ఉదా. బస్టాప్ సమీపంలోని MG రోడ్‌లో వీధి దీపం 3 రోజులుగా పని చేయడం లేదు",
        charsLeft: "అక్షరాలు మిగిలి ఉన్నాయి",
        photoOptional: "ఫోటో (ఐచ్ఛికం)",
        tapToUpload: "ఫోటో తీయడానికి లేదా అప్‌లోడ్ చేయడానికి నొక్కండి",
        uploading: "అప్‌లోడ్ అవుతోంది...",
        saving: "సేవ్ అవుతోంది...",
        failed: "విఫలమైంది — మళ్లీ ప్రయత్నించండి",
        submit: "నివేదికను సమర్పించండి",
        dailyLimit: "రోజువారీ పరిమితి చేరుకున్నారు",
        dailyLimitDesc: "మీరు ఈరోజు గరిష్టంగా 3 నివేదికలను సమర్పించారు. మీ పౌర నిబద్ధతకు ధన్యవాదాలు! దయచేసి మరిన్ని సమర్పించడానికి రేపు తిరిగి రండి.",
        successMsg: "నివేదిక సమర్పించబడింది — ధన్యవాదాలు!",
        trackingToken: "మీ ట్రాకింగ్ టోకెన్:",
        saveToken: "మీ ఫిర్యాదు స్థితిని తనిఖీ చేయడానికి ఈ టోకెన్‌ను సేవ్ చేయండి.",
        submitAnother: "మరో నివేదికను సమర్పించండి",
      },
      categories: {
        streetlight: "వీధి దీపం",
        water: "నీరు",
        garbage: "చెత్త",
        roads: "రోడ్లు",
        drainage: "డ్రైనేజీ",
        electricity: "విద్యుత్",
        encroachment: "ఆక్రమణ",
        publictoilet: "పబ్లిక్ టాయిలెట్",
        park: "పార్క్ / గార్డెన్",
        other: "ఇతర",
      }
    }
  }
};

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: "en", // language to use, more information here: https://www.i18next.com/overview/configuration-options#languages-namespaces-resources
    // you can use the i18n.changeLanguage function to change the language manually: https://www.i18next.com/overview/api#changelanguage
    // if you're using a language detector, do not define the lng option

    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
