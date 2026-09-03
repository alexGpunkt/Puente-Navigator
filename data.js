
const APP_DATA = {
  meta:{updated:"2026-09-03",version:"0.7.0"},
  ui:{
    es:{
      navHome:"Inicio",navAssistant:"Asistente",navCase:"Caso",navDeadlines:"Plazos",navMore:"Más",navAdvice:"Asesoría",navDocs:"Documentos",navLost:"Perdidos",navProgress:"Progreso",
      heroTitle:"Menos barreras. Más claridad.",
      heroText:"Guía bilingüe para preparar trámites en Alemania, saber qué falta y encontrar la forma más sencilla de conseguir cada dato.",
      choose:"¿Qué quieres preparar?",chooseText:"Este prototipo empieza con dos solicitudes frecuentes y un modo de emergencia documental.",
      lostTitle:"He perdido documentos",lostSub:"reconstruye los datos paso a paso",
      docsTitle:"¿Dónde encuentro esta información?",docsSub:"Busca un documento o dato y abre rutas ordenadas por dificultad.",
      important:"Importante",evidenceLate:"Para Grundsicherungsgeld puedes presentar la solicitud aunque todavía falten justificantes; entrégalos lo antes posible. No entregues originales al Jobcenter.",
      privacyShort:"Sin cuenta, sin nube y sin analítica. El progreso se guarda solo en este dispositivo.",
      statusHave:"Lo tengo",statusUnsure:"No sé",statusMissing:"Me falta",how:"Cómo conseguirlo",required:"Necesario",conditional:"Según el caso",
      progress:"Progreso",ready:"marcado como disponible",print:"Imprimir / PDF",sources:"Fuentes oficiales",reset:"Borrar progreso",
      searchPlaceholder:"Buscar: Steuer-ID, alquiler, seguro…",noResults:"No se encontraron resultados.",copyRequest:"Copiar solicitud",copied:"Texto copiado",
      lostIntro:"Si se perdió todo (por ejemplo por incendio), no intentes resolverlo todo a la vez. Empieza por la identidad y reconstruye después los registros administrativos.",
      currentStatus:"Estado de este caso",noCase:"Todavía no has marcado documentos.",
      privacyTitle:"Privacidad de este prototipo",privacyBody:"La aplicación no pide números de documento, cuentas bancarias ni fotos. Solo guarda localmente si un documento está disponible, dudoso o falta. No se envían datos a ningún servidor.",
      resetConfirm:"¿Borrar todo el progreso guardado en este dispositivo?",legalNote:"Guía práctica, no asesoramiento jurídico. La autoridad competente puede pedir documentos adicionales según el caso y el municipio.",
      berlinNote:"La lista de Wohngeld usa como referencia una lista oficial de Berlin para Mietzuschuss. En otros municipios pueden variar detalles y formularios; comprueba siempre la Wohngeldbehörde local.",
      openOfficial:"Abrir fuente oficial"
    },
    de:{
      navHome:"Start",navAssistant:"Assistent",navCase:"Fall",navDeadlines:"Fristen",navMore:"Mehr",navAdvice:"Beratung",navDocs:"Dokumente",navLost:"Verlust",navProgress:"Fortschritt",
      heroTitle:"Weniger Hürden. Mehr Klarheit.",
      heroText:"Zweisprachiger Navigator, um Behördenanträge vorzubereiten, fehlende Angaben zu erkennen und den einfachsten Beschaffungsweg zu finden.",
      choose:"Was soll vorbereitet werden?",chooseText:"Dieser Prototyp startet mit zwei häufigen Anträgen und einem Dokumentverlust-Modus.",
      lostTitle:"Dokumente verloren",lostSub:"Angaben Schritt für Schritt rekonstruieren",
      docsTitle:"Wo finde ich diese Information?",docsSub:"Dokument oder Angabe suchen und nach Aufwand sortierte Wege öffnen.",
      important:"Wichtig",evidenceLate:"Grundsicherungsgeld kann beantragt werden, auch wenn Nachweise noch fehlen; diese sollten schnellstmöglich nachgereicht werden. Beim Jobcenter keine Originale einreichen.",
      privacyShort:"Kein Konto, keine Cloud, keine Analyse. Fortschritt bleibt nur auf diesem Gerät.",
      statusHave:"Vorhanden",statusUnsure:"Unsicher",statusMissing:"Fehlt",how:"Beschaffungswege",required:"Erforderlich",conditional:"Je nach Fall",
      progress:"Fortschritt",ready:"als vorhanden markiert",print:"Drucken / PDF",sources:"Offizielle Quellen",reset:"Fortschritt löschen",
      searchPlaceholder:"Suchen: Steuer-ID, Miete, Krankenkasse…",noResults:"Keine Ergebnisse gefunden.",copyRequest:"Anfrage kopieren",copied:"Text kopiert",
      lostIntro:"Wenn alles verloren ging (z. B. durch Brand), nicht alles gleichzeitig lösen. Zuerst Identität sichern, dann Verwaltungsdaten systematisch rekonstruieren.",
      currentStatus:"Stand dieses Falls",noCase:"Noch keine Dokumente markiert.",
      privacyTitle:"Datenschutz dieses Prototyps",privacyBody:"Die App fragt keine Ausweisnummern, Kontodaten oder Fotos ab. Gespeichert wird nur lokal, ob ein Dokument vorhanden, unklar oder fehlend ist. Es werden keine Daten an einen Server gesendet.",
      resetConfirm:"Gesamten gespeicherten Fortschritt auf diesem Gerät löschen?",legalNote:"Praktische Orientierung, keine Rechtsberatung. Die zuständige Behörde kann je nach Einzelfall und Kommune weitere Nachweise verlangen.",
      berlinNote:"Für Wohngeld orientiert sich die Kernliste an einer offiziellen Berliner Mietzuschuss-Liste. In anderen Kommunen können Details und Formulare abweichen; immer die örtliche Wohngeldbehörde prüfen.",
      openOfficial:"Offizielle Quelle öffnen"
    }
  },

  // ---------------------------------------------------------------------------
  // v0.5 – Fristen, Bescheidanalyse, Beratungsstellen
  // ---------------------------------------------------------------------------

  // Fristarten. "months"/"days" = Regelfrist ab Startereignis.
  // postDays = Bekanntgabefiktion (§ 37 Abs. 2 SGB X: dritter Tag nach Aufgabe zur Post).
  deadlineTypes:[
    {
      id:"widerspruch", icon:"⚖️", months:1, postDays:3, startLabel:{es:"Fecha del acto administrativo",de:"Datum des Bescheids"},
      title:{es:"Recurso (Widerspruch)",de:"Widerspruch"},
      basis:"§ 84 SGG · § 37 Abs. 2 SGB X",
      help:{
        es:"Un mes desde la notificación. Si el acto se envió por correo dentro de Alemania, se considera notificado al tercer día tras el envío. Sin instrucción de recurso o con instrucción incorrecta, el plazo es de un año (§ 66 SGG).",
        de:"Ein Monat ab Bekanntgabe. Bei Postversand im Inland gilt der Bescheid am dritten Tag nach Aufgabe zur Post als bekanntgegeben. Fehlt die Rechtsbehelfsbelehrung oder ist sie fehlerhaft, beträgt die Frist ein Jahr (§ 66 SGG)."
      }
    },
    {
      id:"klage", icon:"🏛️", months:1, postDays:3, startLabel:{es:"Fecha de la resolución del recurso",de:"Datum des Widerspruchsbescheids"},
      title:{es:"Demanda ante el Sozialgericht",de:"Klage beim Sozialgericht"},
      basis:"§ 87 SGG",
      help:{
        es:"Un mes desde la notificación de la resolución del recurso. El procedimiento ante el Sozialgericht no tiene tasas para la persona solicitante.",
        de:"Ein Monat ab Bekanntgabe des Widerspruchsbescheids. Das Verfahren vor dem Sozialgericht ist für Leistungsberechtigte gerichtskostenfrei."
      }
    },
    {
      id:"mitwirkung", icon:"📨", days:14, postDays:0, startLabel:{es:"Fecha indicada por la autoridad",de:"Von der Behörde gesetztes Datum"},
      title:{es:"Aportar documentos requeridos",de:"Mitwirkung / Unterlagen nachreichen"},
      basis:"§§ 60–62, 66 SGB I",
      help:{
        es:"La autoridad fija el plazo en su carta; introduce esa fecha exacta. Si no se cumple, la prestación puede reducirse o suspenderse tras aviso escrito.",
        de:"Die Behörde setzt die Frist im Schreiben selbst; dieses Datum bitte genau übernehmen. Bei Versäumnis kann die Leistung nach schriftlicher Belehrung versagt oder entzogen werden."
      }
    },
    {
      id:"weiterbewilligung", icon:"🔁", months:0, days:0, postDays:0, leadDays:60, startLabel:{es:"Fin del periodo de concesión",de:"Ende des Bewilligungszeitraums"},
      title:{es:"Solicitud de continuación",de:"Weiterbewilligungsantrag"},
      basis:"§ 37 SGB II",
      help:{
        es:"Presenta la continuación con antelación suficiente, aproximadamente dos meses antes de que termine el periodo de concesión, para que no haya un mes sin prestación.",
        de:"Den Weiterbewilligungsantrag rechtzeitig stellen, etwa zwei Monate vor Ende des Bewilligungszeitraums, damit keine Lücke in der Leistung entsteht."
      }
    },
    {
      id:"wohngeld_weiter", icon:"🏠", leadDays:60, postDays:0, startLabel:{es:"Fin del periodo de concesión",de:"Ende des Bewilligungszeitraums"},
      title:{es:"Continuación de Wohngeld",de:"Wohngeld-Weiterleistungsantrag"},
      basis:"§ 25 WoGG",
      help:{
        es:"Wohngeld se concede normalmente por doce meses. La continuación debe solicitarse antes de que termine el periodo; de lo contrario puede haber meses sin pago.",
        de:"Wohngeld wird in der Regel für zwölf Monate bewilligt. Der Weiterleistungsantrag muss vor Ablauf gestellt werden, sonst können Monate ohne Zahlung entstehen."
      }
    },
    {
      id:"veraenderung", icon:"⚡", days:3, postDays:0, startLabel:{es:"Fecha del cambio",de:"Datum der Änderung"},
      title:{es:"Comunicar un cambio",de:"Veränderung mitteilen"},
      basis:"§ 60 Abs. 1 SGB I",
      help:{
        es:"Los cambios en ingresos, vivienda o composición del hogar deben comunicarse sin demora. Comunicar tarde puede generar devoluciones.",
        de:"Änderungen bei Einkommen, Wohnung oder Haushalt müssen unverzüglich mitgeteilt werden. Späte Mitteilung führt häufig zu Rückforderungen."
      }
    },
    {
      id:"termin", icon:"📅", days:0, postDays:0, startLabel:{es:"Fecha de la cita",de:"Datum des Termins"},
      title:{es:"Cita en la administración",de:"Behördentermin"},
      basis:"§ 59 SGB II",
      help:{
        es:"A las citas del Jobcenter hay que acudir. Si no es posible, avisar antes y por escrito, con justificante.",
        de:"Meldetermine beim Jobcenter sind wahrzunehmen. Wenn das nicht möglich ist, vorher schriftlich absagen und den Grund nachweisen."
      }
    },
    {
      id:"custom", icon:"🔖", days:0, postDays:0, startLabel:{es:"Fecha límite",de:"Stichtag"},
      title:{es:"Otro plazo",de:"Eigene Frist"},
      basis:"",
      help:{es:"Plazo propio, por ejemplo un acuerdo con la oficina o una cita médica necesaria para el expediente.",de:"Eigene Frist, zum Beispiel eine Absprache mit der Behörde oder ein Termin, der für den Fall gebraucht wird."}
    }
  ],

  // Erkennungsmuster für Bescheide (ergänzt die Dokumenttyp-Erkennung).
  noticeSignals:{
    rechtsbehelf:["rechtsbehelfsbelehrung","widerspruch","rechtsmittelbelehrung","widerspruchsbelehrung"],
    aufhebung:["aufhebung","erstattung","rückforderung","rueckforderung","widerruf","rücknahme"],
    ablehnung:["ablehnung","abgelehnt","wird abgelehnt","versagung","versagt"],
    bewilligung:["bewilligung","bewilligt","wird bewilligt","leistungen werden"]
  },

  // Anlaufstellen. Bewusst nur bundesweite, offizielle Portale mit stabilen
  // Adressen – die App erfindet keine örtlichen Adressen oder Telefonnummern.
  advisory:[
    {
      id:"mbe", icon:"🧑‍💼", free:true,
      title:{es:"Asesoría para adultos migrantes (MBE)",de:"Migrationsberatung für erwachsene Zugewanderte (MBE)"},
      who:{es:"a partir de 27 años",de:"ab 27 Jahren"},
      desc:{es:"Asesoría gratuita y confidencial sobre trámites, prestaciones, vivienda y trabajo. Financiada por el Estado, ofrecida por Caritas, Diakonie, AWO, Paritätischer, Cruz Roja y ZWST. Muchas sedes atienden en español.",
            de:"Kostenlose, vertrauliche Beratung zu Behördenwegen, Leistungen, Wohnen und Arbeit. Bundesgefördert, getragen von Caritas, Diakonie, AWO, Paritätischem, DRK und ZWST. Viele Stellen beraten auf Spanisch."},
      topics:["antrag","bescheid","wohnen","arbeit","allgemein"],
      links:[
        {label:{es:"Buscar sede (BAMF-NAvI)",de:"Beratungsstelle suchen (BAMF-NAvI)"},url:"https://bamf-navi.bamf.de/de/"},
        {label:{es:"Información sobre la MBE",de:"Informationen zur MBE"},url:"https://www.migrationsberatung.org/de/"},
        {label:{es:"Asesoría online por chat (mbeon)",de:"Online-Beratung per Chat (mbeon)"},url:"https://www.mbeon.de/"}
      ]
    },
    {
      id:"jmd", icon:"🧑‍🎓", free:true,
      title:{es:"Servicio de migración juvenil (JMD)",de:"Jugendmigrationsdienst (JMD)"},
      who:{es:"de 12 a 27 años",de:"12 bis 27 Jahre"},
      desc:{es:"Acompañamiento para personas jóvenes: escuela, formación profesional, trabajo y trámites. Alrededor de 500 sedes en toda Alemania.",
            de:"Begleitung für junge Menschen: Schule, Ausbildung, Arbeit und Behördenwege. Rund 500 Beratungsstellen bundesweit."},
      topics:["antrag","arbeit","allgemein"],
      links:[
        {label:{es:"Buscar sede JMD",de:"JMD vor Ort suchen"},url:"https://www.jugendmigrationsdienste.de/"}
      ]
    },
    {
      id:"wohlfahrt", icon:"🤝", free:true,
      title:{es:"Asesoría social general",de:"Allgemeine Sozialberatung"},
      who:{es:"para todas las personas",de:"für alle"},
      desc:{es:"Caritas y Diakonie mantienen asesorías sociales abiertas a cualquier persona, también sin ser miembro y sin importar la religión. Útiles cuando el caso no encaja en ninguna categoría.",
            de:"Caritas und Diakonie unterhalten offene Sozialberatungen für alle, unabhängig von Mitgliedschaft und Konfession. Hilfreich, wenn der Fall in keine Schublade passt."},
      topics:["allgemein","antrag","schulden"],
      links:[
        {label:{es:"Direcciones de Caritas",de:"Adressen der Caritas"},url:"https://www.caritas.de/adressen"},
        {label:{es:"Ayuda de Diakonie",de:"Hilfe der Diakonie"},url:"https://www.diakonie.de/hilfe-und-beratung"}
      ]
    },
    {
      id:"sozialverband", icon:"⚖️", free:false,
      title:{es:"Asociaciones sociales (SoVD, VdK)",de:"Sozialverbände (SoVD, VdK)"},
      who:{es:"con cuota de socio",de:"mit Mitgliedsbeitrag"},
      desc:{es:"Representan a sus socios frente al Jobcenter y ante el Sozialgericht, incluidos recursos y demandas. Requiere hacerse socio, con cuota mensual reducida; conviene apuntarse antes de que empiece el conflicto.",
            de:"Vertreten Mitglieder gegenüber Jobcenter und vor dem Sozialgericht, auch bei Widerspruch und Klage. Setzt eine Mitgliedschaft mit geringem Monatsbeitrag voraus; sinnvoll, bevor der Streit beginnt."},
      topics:["bescheid","widerspruch","klage"],
      links:[
        {label:{es:"SoVD",de:"SoVD"},url:"https://www.sovd.de/"},
        {label:{es:"VdK",de:"VdK"},url:"https://www.vdk.de/"}
      ]
    },
    {
      id:"beratungshilfe", icon:"📜", free:true,
      title:{es:"Beratungshilfe: abogacía financiada",de:"Beratungshilfe: anwaltliche Hilfe finanzieren"},
      who:{es:"con ingresos bajos",de:"bei geringem Einkommen"},
      desc:{es:"Con pocos ingresos, el Amtsgericht puede emitir un bono (Beratungshilfeschein) que cubre la asesoría de un abogado. Se solicita en el Amtsgericht del lugar de residencia, también de forma presencial.",
            de:"Bei geringem Einkommen stellt das Amtsgericht auf Antrag einen Beratungshilfeschein aus, mit dem anwaltliche Beratung finanziert wird. Antrag beim Amtsgericht des Wohnorts, auch persönlich möglich."},
      topics:["bescheid","widerspruch","klage"],
      links:[
        {label:{es:"Información y solicitud",de:"Informationen und Antrag"},url:"https://service.justiz.de/beratungshilfe"}
      ]
    },
    {
      id:"mieterverein", icon:"🔑", free:false,
      title:{es:"Asociación de inquilinos",de:"Mieterverein"},
      who:{es:"con cuota de socio",de:"mit Mitgliedsbeitrag"},
      desc:{es:"Para conflictos de alquiler: liquidación de gastos, subidas, defectos de la vivienda, aviso de desalojo. Relevante también cuando el Jobcenter considera el alquiler demasiado alto.",
            de:"Bei Mietkonflikten: Betriebskostenabrechnung, Mieterhöhung, Mängel, Kündigung. Auch relevant, wenn das Jobcenter die Miete als unangemessen einstuft."},
      topics:["wohnen"],
      links:[
        {label:{es:"Deutscher Mieterbund",de:"Deutscher Mieterbund"},url:"https://www.mieterbund.de/"}
      ]
    },
    {
      id:"schuldner", icon:"💶", free:true,
      title:{es:"Asesoría de deudas",de:"Schuldnerberatung"},
      who:{es:"para todas las personas",de:"für alle"},
      desc:{es:"Gratuita en las asesorías reconocidas. Importante cuando hay devoluciones del Jobcenter, deudas de alquiler o de energía.",
            de:"Bei anerkannten Stellen kostenlos. Wichtig bei Rückforderungen des Jobcenters, Miet- oder Energieschulden."},
      topics:["schulden"],
      links:[
        {label:{es:"Buscar asesoría de deudas",de:"Schuldnerberatung suchen"},url:"https://www.meine-schulden.de/"}
      ]
    },
    {
      id:"antidiskriminierung", icon:"🛡️", free:true,
      title:{es:"Oficina contra la discriminación",de:"Antidiskriminierungsstelle"},
      who:{es:"para todas las personas",de:"für alle"},
      desc:{es:"Si el trato en una oficina, en la búsqueda de vivienda o en el trabajo parece discriminatorio, existe asesoría federal gratuita.",
            de:"Wenn die Behandlung bei einer Behörde, bei der Wohnungssuche oder im Betrieb diskriminierend wirkt, gibt es kostenlose Beratung des Bundes."},
      topics:["allgemein","wohnen","arbeit"],
      links:[
        {label:{es:"Antidiskriminierungsstelle des Bundes",de:"Antidiskriminierungsstelle des Bundes"},url:"https://www.antidiskriminierungsstelle.de/"}
      ]
    }
  ],

  advisoryTopics:[
    {id:"alle",     label:{es:"Todo",de:"Alle"}},
    {id:"antrag",   label:{es:"Solicitud",de:"Antrag stellen"}},
    {id:"bescheid", label:{es:"Resolución recibida",de:"Bescheid erhalten"}},
    {id:"widerspruch",label:{es:"Recurso",de:"Widerspruch"}},
    {id:"wohnen",   label:{es:"Vivienda",de:"Wohnen"}},
    {id:"arbeit",   label:{es:"Trabajo",de:"Arbeit"}},
    {id:"schulden", label:{es:"Deudas",de:"Schulden"}},
    {id:"allgemein",label:{es:"General",de:"Allgemein"}}
  ],

  advisoryPrep:[
    {es:"Lleva el documento de identidad y, si existe, el último Bescheid completo, incluidas todas las páginas.",
     de:"Ausweis mitnehmen und, falls vorhanden, den letzten Bescheid vollständig mit allen Seiten."},
    {es:"Anota antes la pregunta concreta en una frase. Eso ahorra tiempo de asesoría.",
     de:"Die konkrete Frage vorher in einem Satz aufschreiben. Das spart Beratungszeit."},
    {es:"Lleva el expediente impreso de Puente: contiene el estado, lo que falta y los datos ya reunidos.",
     de:"Die gedruckte Fallakte aus Puente mitnehmen: Sie enthält Stand, Fehlstellen und die gesammelten Angaben."},
    {es:"Pregunta si la sede atiende en español o si puede acompañarte una persona que traduzca.",
     de:"Nachfragen, ob die Stelle auf Spanisch berät oder ob eine übersetzende Person mitkommen darf."},
    {es:"Si hay un plazo en marcha, dilo al principio de la conversación, no al final.",
     de:"Wenn eine Frist läuft, das gleich zu Beginn des Gesprächs sagen, nicht erst am Ende."}
  ],

  services:{
    grundsicherung:{
      icon:"🧾",
      title:{es:"Grundsicherungsgeld",de:"Grundsicherungsgeld"},
      subtitle:{es:"antes Bürgergeld / Hartz IV · Jobcenter",de:"vormals Bürgergeld / Hartz IV · Jobcenter"},
      note:{es:"La lista exacta depende de la situación personal. El Jobcenter exige justificar los datos; los justificantes que faltan pueden entregarse después.",de:"Die genaue Liste hängt von der persönlichen Situation ab. Angaben müssen belegt werden; fehlende Nachweise können nachgereicht werden."},
      requirements:[
        ["id_document","required"],["registration","conditional"],["residence_right","conditional"],
        ["tax_id","conditional"],["social_insurance","conditional"],["health_insurance","required"],
        ["iban","required"],["bank_statements","required"],["income_proof","required"],["assets","required"],
        ["rental_contract","conditional"],["heating_costs","conditional"],["previous_benefits","conditional"],["employment_end","conditional"]
      ]
    },
    wohngeld:{
      icon:"🏠",
      title:{es:"Wohngeld",de:"Wohngeld"},
      subtitle:{es:"Mietzuschuss para inquilinos",de:"Mietzuschuss für Mieter"},
      note:{es:"Los formularios y algunos justificantes dependen del municipio. Esta lista cubre documentos básicos habituales para un Mietzuschuss.",de:"Formulare und einzelne Nachweise unterscheiden sich kommunal. Diese Liste deckt typische Kernunterlagen für den Mietzuschuss ab."},
      requirements:[
        ["household_ids","required"],["residence_right","conditional"],["rental_contract","required"],
        ["rent_payments","required"],["income_all_household","required"],["transfer_benefits","conditional"],["special_deductions","conditional"]
      ]
    }
  },

  documents:{
    id_document:{
      icon:"🪪",title:{es:"Documento de identidad",de:"Ausweisdokument"},
      desc:{es:"DNI/pasaporte válido; para documentos alemanes, Personalausweis o Reisepass.",de:"Gültiger Ausweis/Pass; bei deutschen Dokumenten Personalausweis oder Reisepass."},
      recovery:[
        {level:1,es:"Busca fotos o escaneos antiguos en el móvil, correo electrónico o carpeta de documentos. Sirven para reconstruir datos, aunque no sustituyen siempre el original.",de:"Alte Fotos/Scans auf Handy, E-Mail oder Dokumentenordner prüfen. Sie helfen bei der Rekonstruktion, ersetzen aber nicht immer das Original."},
        {level:2,es:"Si el documento es español u otro documento extranjero: contacta con el consulado/embajada correspondiente para saber el procedimiento de sustitución.",de:"Bei spanischem oder anderem ausländischen Ausweis: zuständiges Konsulat/Botschaft nach dem Ersatzverfahren fragen."},
        {level:3,es:"Si es un documento alemán: solicita uno nuevo en la autoridad de pasaportes/documentos de identidad de tu municipio.",de:"Bei deutschem Ausweisdokument: neues Dokument bei der Pass-/Personalausweisbehörde der Kommune beantragen."},
        {level:4,es:"Si no puedes acreditar tu identidad de ninguna forma, pide apoyo al consulado o a una Beratungsstelle antes de seguir con trámites complejos.",de:"Wenn die Identität gar nicht nachweisbar ist, vor komplexen Anträgen Unterstützung beim Konsulat oder einer Beratungsstelle holen."}
      ]
    },
    registration:{
      icon:"📍",title:{es:"Meldebescheinigung / domicilio registrado",de:"Meldebescheinigung / Meldedaten"},
      desc:{es:"Prueba de domicilio; según la versión puede incluir entrada, estado civil y domicilios anteriores.",de:"Nachweis der Meldedaten; je nach Ausführung auch Einzugsdatum, Familienstand oder frühere Anschriften."},
      recovery:[
        {level:1,es:"Comprueba si ya tienes una Meldebescheinigung en PDF, correo electrónico o carpeta de trámites.",de:"Prüfen, ob eine Meldebescheinigung bereits als PDF, E-Mail-Anhang oder Papier vorhanden ist."},
        {level:2,es:"Pregunta a tu Bürgeramt/Meldebehörde local. En muchas ciudades se puede solicitar de nuevo.",de:"Bei Bürgeramt/Meldebehörde nachfragen. In vielen Städten kann sie erneut beantragt werden."},
        {level:3,es:"Ejemplo Berlin: puede solicitarse online o en el Bürgeramt; pueden incluirse datos adicionales.",de:"Beispiel Berlin: online oder beim Bürgeramt beantragen; zusätzliche Meldedaten können aufgenommen werden.",url:"https://service.berlin.de/dienstleistung/120702/"}
      ]
    },
    residence_right:{
      icon:"🌍",title:{es:"Derecho de residencia",de:"Aufenthaltsrecht"},
      desc:{es:"Para ciudadanos de la UE suele bastar el documento de identidad; para terceros países puede ser necesario un Aufenthaltstitel.",de:"Bei EU-Staatsangehörigen genügt häufig das Ausweisdokument; bei Drittstaaten kann ein Aufenthaltstitel erforderlich sein."},
      recovery:[
        {level:1,es:"Comprueba nacionalidad y documento de identidad. No confundas idioma español con ciudadanía española/UE.",de:"Staatsangehörigkeit und Ausweisdokument prüfen. Spanische Sprache bedeutet nicht automatisch spanische/EU-Staatsangehörigkeit."},
        {level:2,es:"Busca Aufenthaltstitel, Fiktionsbescheinigung o cartas de la Ausländerbehörde.",de:"Aufenthaltstitel, Fiktionsbescheinigung oder Schreiben der Ausländerbehörde suchen."},
        {level:3,es:"Si falta el documento, contacta con la Ausländerbehörde competente o, para documentos del país de origen, con el consulado.",de:"Fehlende Aufenthaltsdokumente bei der zuständigen Ausländerbehörde klären; Herkunftsdokumente ggf. über das Konsulat."},
        {level:4,es:"Si el derecho de residencia es incierto, recomienda asesoramiento especializado antes de hacer afirmaciones en el formulario.",de:"Bei unklarem Aufenthaltsrecht fachkundige Beratung empfehlen, bevor Angaben im Antrag festgelegt werden."}
      ]
    },
    tax_id:{
      icon:"🔢",title:{es:"Steuer-ID (IdNr)",de:"Steuer-ID (IdNr)"},
      desc:{es:"Número fiscal personal alemán de 11 dígitos.",de:"Persönliche 11-stellige steuerliche Identifikationsnummer."},
      recovery:[
        {level:1,es:"Busca en nóminas, Lohnsteuerbescheinigung, Steuerbescheid o cartas fiscales antiguas.",de:"Auf Lohnabrechnung, Lohnsteuerbescheinigung, Steuerbescheid oder alten Steuerschreiben nachsehen."},
        {level:2,es:"Pregunta a un antiguo empleador si puede darte una nómina o Lohnsteuerbescheinigung de nuevo.",de:"Früheren Arbeitgeber nach erneutem Abruf von Lohnabrechnung/Lohnsteuerbescheinigung fragen."},
        {level:3,es:"Solicita una nueva comunicación oficial de la IdNr al Bundeszentralamt für Steuern. No se comunica por teléfono ni por correo electrónico normal.",de:"Erneute Mitteilung der IdNr beim Bundeszentralamt für Steuern beantragen. Die IdNr wird nicht telefonisch oder per normaler E-Mail mitgeteilt.",url:"https://www.elster.de/bportal/formulare-leistungen/alleformulare/idnr?locale=de_DE"}
      ],requestTarget:{es:"antiguo empleador",de:"früherer Arbeitgeber"}
    },
    social_insurance:{
      icon:"🧩",title:{es:"Rentenversicherungsnummer / SV-Nummer",de:"Rentenversicherungsnummer / SV-Nummer"},
      desc:{es:"Número de seguro de pensiones/seguridad social alemana.",de:"Versicherungsnummer der Deutschen Rentenversicherung."},
      recovery:[
        {level:1,es:"Busca 'SV-Nr.', 'Versicherungsnummer' o 'Rentenversicherungsnummer' en nóminas y Meldungen zur Sozialversicherung.",de:"Auf Lohnabrechnungen und SV-Meldungen nach 'SV-Nr.', 'Versicherungsnummer' oder 'Rentenversicherungsnummer' suchen."},
        {level:2,es:"Pregunta a tu Krankenkasse. El Versicherungsnummernachweis puede solicitarse gratuitamente también allí.",de:"Bei der Krankenkasse fragen. Der Versicherungsnummernachweis kann auch dort kostenfrei angefordert werden."},
        {level:3,es:"Solicita gratis un nuevo Versicherungsnummernachweis en los Online-Services de la Deutsche Rentenversicherung.",de:"Kostenfrei einen neuen Versicherungsnummernachweis über die Online-Services der Deutschen Rentenversicherung beantragen.",url:"https://www.deutsche-rentenversicherung.de/DRV/DE/Rente/Allgemeine-Informationen/Sozialversicherungsausweis/Sozialversicherungsausweis.html"}
      ],requestTarget:{es:"Krankenkasse / Deutsche Rentenversicherung",de:"Krankenkasse / Deutsche Rentenversicherung"}
    },
    health_insurance:{
      icon:"💳",title:{es:"Seguro médico / Krankenkasse",de:"Krankenversicherung / Krankenkasse"},
      desc:{es:"Nombre de la Krankenkasse y, si es posible, Versicherungsnummer/Mitgliedsbescheinigung.",de:"Name der Krankenkasse und möglichst Versichertennummer/Mitgliedsbescheinigung."},
      recovery:[
        {level:1,es:"Mira la Gesundheitskarte o una nómina; normalmente aparece el nombre de la Krankenkasse.",de:"Gesundheitskarte oder Lohnabrechnung prüfen; dort steht meist die Krankenkasse."},
        {level:2,es:"Llama o escribe a la Krankenkasse y pide una Mitgliedsbescheinigung y, si hace falta, una nueva tarjeta.",de:"Krankenkasse kontaktieren und Mitgliedsbescheinigung bzw. bei Bedarf eine neue Gesundheitskarte anfordern."},
        {level:3,es:"Si no recuerdas la Krankenkasse, pregunta al último empleador, Agentur für Arbeit o antiguo Jobcenter qué caja figuraba en sus datos.",de:"Wenn die Krankenkasse unbekannt ist, beim letzten Arbeitgeber, der Agentur für Arbeit oder früheren Jobcenter nachfragen, welche Kasse hinterlegt war."}
      ],requestTarget:{es:"Krankenkasse",de:"Krankenkasse"}
    },
    iban:{
      icon:"🏦",title:{es:"IBAN / cuenta para recibir pagos",de:"IBAN / Auszahlungskonto"},
      desc:{es:"Titular e IBAN de la cuenta bancaria.",de:"Kontoinhaber und IBAN des Auszahlungskontos."},
      recovery:[
        {level:1,es:"Abre la app de tu banco u Onlinebanking; la IBAN suele estar en los detalles de cuenta.",de:"Bank-App/Onlinebanking öffnen; die IBAN steht meist bei den Kontodetails."},
        {level:2,es:"Busca un Kontoauszug, contrato bancario o carta del banco.",de:"Kontoauszug, Kontovertrag oder Bankschreiben prüfen."},
        {level:3,es:"Si perdiste el acceso digital, pide al banco restablecerlo tras comprobar tu identidad.",de:"Bei verlorenem Onlinezugang Zugang nach Identitätsprüfung durch die Bank zurücksetzen lassen."}
      ]
    },
    bank_statements:{
      icon:"📊",title:{es:"Kontoauszüge de los últimos 3 meses",de:"Kontoauszüge der letzten 3 Monate"},
      desc:{es:"La Bundesagentur menciona extractos bancarios de los últimos tres meses como justificante importante para Grundsicherungsgeld.",de:"Die Bundesagentur nennt Kontoauszüge der vergangenen drei Monate als wichtigen Nachweis für Grundsicherungsgeld."},
      recovery:[
        {level:1,es:"Descarga los extractos desde Onlinebanking. Comprueba todas las cuentas actuales.",de:"Auszüge aus dem Onlinebanking herunterladen. Alle aktuell bestehenden Konten prüfen."},
        {level:2,es:"En muchas entidades puedes pedir copias de extractos antiguos.",de:"Bei vielen Banken können alte Kontoauszüge erneut angefordert werden."},
        {level:3,es:"Si una cuenta se cerró recientemente y es relevante para el período solicitado, pide al banco un cierre o extractos del período.",de:"Bei kürzlich geschlossenem, für den Zeitraum relevantem Konto ggf. Abschluss-/Zeitraumnachweis bei der Bank anfordern."}
      ]
    },
    income_proof:{
      icon:"💶",title:{es:"Justificantes de ingresos",de:"Einkommensnachweise"},
      desc:{es:"Nóminas, pensión, Krankengeld, Unterhalt, etc., según la situación.",de:"Lohnabrechnungen, Rente, Krankengeld, Unterhalt usw. je nach Situation."},
      recovery:[
        {level:1,es:"Busca nóminas o Bescheide en correo electrónico, portales del empleador y carpetas PDF.",de:"Lohnabrechnungen/Bescheide in E-Mail, Arbeitgeberportal und PDF-Ordnern suchen."},
        {level:2,es:"Pide al empleador o al organismo pagador copias nuevas.",de:"Arbeitgeber oder zahlende Stelle um neue Kopien bitten."},
        {level:3,es:"Si el ingreso procede de una prestación pública, pide un duplicado del Bescheid al organismo competente.",de:"Bei Sozialleistungen einen Ersatzbescheid bei der zuständigen Stelle anfordern."}
      ],requestTarget:{es:"empleador / organismo pagador",de:"Arbeitgeber / Leistungsträger"}
    },
    assets:{
      icon:"🧮",title:{es:"Patrimonio / Vermögen",de:"Vermögen"},
      desc:{es:"Cuentas, PayPal, ahorro, efectivo, inversiones, vehículos, inmuebles y otros bienes relevantes.",de:"Konten, PayPal, Sparguthaben, Bargeld, Anlagen, Fahrzeuge, Immobilien und sonstiges relevantes Vermögen."},
      recovery:[
        {level:1,es:"Haz una lista de todas las cuentas y plataformas que aún existen. No declares como actual una cuenta ya cerrada.",de:"Liste aller aktuell bestehenden Konten/Plattformen erstellen. Geschlossene Konten nicht als aktuelles Vermögen angeben."},
        {level:2,es:"Descarga saldos actuales de bancos, PayPal, depósitos, broker y aseguradoras.",de:"Aktuelle Salden/Nachweise von Banken, PayPal, Depotanbietern und Versicherern herunterladen."},
        {level:3,es:"Si no sabes si una cuenta antigua sigue abierta, acláralo con la entidad antes de completar el formulario.",de:"Bei unklarem Status eines alten Kontos den Bestand vor dem Ausfüllen mit dem Anbieter klären."}
      ]
    },
    rental_contract:{
      icon:"📄",title:{es:"Contrato de alquiler",de:"Mietvertrag"},
      desc:{es:"Contrato y modificaciones posteriores del alquiler.",de:"Mietvertrag und spätere Mietänderungen."},
      recovery:[
        {level:1,es:"Busca PDF, fotos, correo electrónico o portal de la Hausverwaltung.",de:"PDF, Fotos, E-Mail oder Portal der Hausverwaltung prüfen."},
        {level:2,es:"Pide una copia al propietario o a la Hausverwaltung.",de:"Kopie beim Vermieter oder der Hausverwaltung anfordern."},
        {level:3,es:"Si solo faltan cifras concretas, pide además una Mietbescheinigung con renta, gastos y superficie.",de:"Wenn konkrete Mietdaten fehlen, zusätzlich Mietbescheinigung mit Miete, Nebenkosten und Wohnfläche anfordern."}
      ],requestTarget:{es:"propietario / Hausverwaltung",de:"Vermieter / Hausverwaltung"}
    },
    heating_costs:{
      icon:"🔥",title:{es:"Gastos de calefacción y Nebenkosten",de:"Heiz- und Nebenkosten"},
      desc:{es:"Heizkosten, Betriebskosten y, según el caso, última Abrechnung.",de:"Heizkosten, Betriebskosten und je nach Fall letzte Abrechnung."},
      recovery:[
        {level:1,es:"Comprueba el contrato de alquiler y la última Betriebskosten-/Heizkostenabrechnung.",de:"Mietvertrag und letzte Betriebs-/Heizkostenabrechnung prüfen."},
        {level:2,es:"Pide una copia a la Hausverwaltung/Vermieter.",de:"Kopie bei Hausverwaltung/Vermieter anfordern."}
      ]
    },
    previous_benefits:{
      icon:"📬",title:{es:"Bescheide de prestaciones anteriores",de:"Bescheide früherer Leistungen"},
      desc:{es:"Por ejemplo de otro Jobcenter, Sozialamt o Agentur für Arbeit.",de:"Zum Beispiel von anderem Jobcenter, Sozialamt oder Agentur für Arbeit."},
      recovery:[
        {level:1,es:"Busca PDFs en el correo o en cuentas online de la autoridad.",de:"PDFs in E-Mail oder Onlinekonto der Behörde suchen."},
        {level:2,es:"Pide una copia al organismo que emitió el Bescheid.",de:"Kopie beim früheren Leistungsträger anfordern."},
        {level:3,es:"Si no recuerdas el Aktenzeichen, facilita nombre, fecha de nacimiento, dirección anterior y período aproximado.",de:"Wenn Aktenzeichen unbekannt ist, Name, Geburtsdatum, frühere Anschrift und ungefähren Zeitraum nennen."}
      ],requestTarget:{es:"Jobcenter / Agentur für Arbeit / Sozialamt",de:"Jobcenter / Agentur für Arbeit / Sozialamt"}
    },
    employment_end:{
      icon:"🧑‍💼",title:{es:"Fin del último empleo",de:"Unterlagen zum letzten Beschäftigungsende"},
      desc:{es:"Arbeitsbescheinigung, Kündigung o documentación equivalente cuando la solicitud sigue a un empleo.",de:"Arbeitsbescheinigung, Kündigung oder vergleichbare Unterlagen, wenn der Antrag an ein Beschäftigungsverhältnis anschließt."},
      recovery:[
        {level:1,es:"Busca Arbeitsvertrag, Kündigung y última nómina.",de:"Arbeitsvertrag, Kündigung und letzte Lohnabrechnung suchen."},
        {level:2,es:"Solicita al antiguo empleador una Arbeitsbescheinigung. La Bundesagentur indica que el empleador debe expedirla.",de:"Arbeitsbescheinigung beim früheren Arbeitgeber anfordern. Die Bundesagentur weist auf die Ausstellungspflicht des Arbeitgebers hin."},
        {level:3,es:"Si hay problemas con el empleador, documenta la solicitud y consulta a Agentur für Arbeit/Jobcenter sobre el siguiente paso.",de:"Bei Problemen mit dem Arbeitgeber Anfrage dokumentieren und Agentur für Arbeit/Jobcenter nach dem weiteren Vorgehen fragen."}
      ],requestTarget:{es:"antiguo empleador",de:"früherer Arbeitgeber"}
    },
    household_ids:{
      icon:"👥",title:{es:"Documentos de identidad de las personas del hogar",de:"Ausweisdokumente der Haushaltsmitglieder"},
      desc:{es:"Para Wohngeld suelen pedirse copias de las personas que viven en la vivienda.",de:"Für Wohngeld werden typischerweise Ausweiskopien der in der Wohnung lebenden Personen verlangt."},
      recovery:[
        {level:1,es:"Haz una lista de todas las personas que viven realmente en la vivienda y comprueba sus documentos.",de:"Alle tatsächlich in der Wohnung lebenden Personen auflisten und Ausweisdokumente prüfen."},
        {level:2,es:"Si falta un documento, usa la ruta 'Documento de identidad' de esta aplicación.",de:"Fehlt ein Dokument, den Beschaffungsweg 'Ausweisdokument' in dieser App verwenden."}
      ]
    },
    rent_payments:{
      icon:"🧾",title:{es:"Prueba de pagos de alquiler",de:"Nachweis der Mietzahlungen"},
      desc:{es:"Para Wohngeld se piden habitualmente pagos de los últimos 3 meses, por ejemplo extractos o recibos.",de:"Für Wohngeld werden typischerweise Mietzahlungen der letzten 3 Monate nachgewiesen, z. B. durch Kontoauszüge oder Quittungen."},
      recovery:[
        {level:1,es:"Filtra en Onlinebanking por el nombre del propietario/Hausverwaltung y guarda los pagos de los últimos 3 meses.",de:"Im Onlinebanking nach Vermieter/Hausverwaltung filtern und Mietzahlungen der letzten 3 Monate sichern."},
        {level:2,es:"Si pagas en efectivo, busca o pide recibos (Quittungen).",de:"Bei Barzahlung vorhandene Quittungen suchen bzw. anfordern."}
      ]
    },
    income_all_household:{
      icon:"👨‍👩‍👧‍👦",title:{es:"Ingresos de todos los miembros del hogar",de:"Einkommen aller Haushaltsmitglieder"},
      desc:{es:"Nóminas, pensiones, prestaciones y otros ingresos de todas las personas relevantes para Wohngeld.",de:"Lohn, Rente, Leistungen und weitere Einkommen aller für Wohngeld relevanten Haushaltsmitglieder."},
      recovery:[
        {level:1,es:"Haz una lista por persona y por tipo de ingreso. Comprueba Bescheide y nóminas.",de:"Pro Person und Einkommensart eine Liste erstellen; Bescheide und Lohnabrechnungen prüfen."},
        {level:2,es:"Pide copias a empleadores y organismos pagadores.",de:"Kopien bei Arbeitgebern und Leistungsträgern anfordern."}
      ]
    },
    transfer_benefits:{
      icon:"🏛️",title:{es:"Bescheide de otras prestaciones",de:"Bescheide über Transferleistungen"},
      desc:{es:"Por ejemplo Arbeitslosengeld, Grundsicherungsgeld, Sozialhilfe o Unterhaltsvorschuss.",de:"Zum Beispiel Arbeitslosengeld, Grundsicherungsgeld, Sozialhilfe oder Unterhaltsvorschuss."},
      recovery:[
        {level:1,es:"Busca los Bescheide actuales de todas las personas del hogar.",de:"Aktuelle Bescheide aller Haushaltsmitglieder suchen."},
        {level:2,es:"Pide un duplicado al organismo competente.",de:"Ersatzbescheid beim zuständigen Leistungsträger anfordern."},
        {level:4,es:"Si alguien recibe una prestación que ya incluye costes de vivienda, no concluyas automáticamente que Wohngeld procede: comprueba la exclusión con la Wohngeldbehörde.",de:"Wenn jemand eine Leistung bezieht, die Unterkunftskosten bereits berücksichtigt, Wohngeld nicht automatisch annehmen; Ausschluss bei der Wohngeldbehörde prüfen."}
      ]
    },
    special_deductions:{
      icon:"➖",title:{es:"Deducciones y situaciones especiales",de:"Absetzungen und besondere Merkmale"},
      desc:{es:"Por ejemplo Werbungskosten, Schwerbehinderung, Pflegegrad o Grundrentenzeiten.",de:"Zum Beispiel Werbungskosten, Schwerbehinderung, Pflegegrad oder Grundrentenzeiten."},
      recovery:[
        {level:1,es:"Comprueba si alguna persona del hogar tiene gastos profesionales relevantes, discapacidad, Pflegegrad o Grundrentenzeiten.",de:"Prüfen, ob Haushaltsmitglieder relevante Werbungskosten, Schwerbehinderung, Pflegegrad oder Grundrentenzeiten haben."},
        {level:2,es:"Reúne los Bescheide o comprobantes correspondientes.",de:"Entsprechende Bescheide/Nachweise zusammentragen."}
      ]
    }
  },

  lostPriority:["id_document","registration","tax_id","social_insurance","health_insurance","iban","bank_statements","rental_contract","income_proof","previous_benefits"],

  sources:[
    {label:{es:"Bundesagentur für Arbeit · Solicitud y justificantes de Grundsicherungsgeld",de:"Bundesagentur für Arbeit · Antrag und Nachweise Grundsicherungsgeld"},url:"https://www.arbeitsagentur.de/grundsicherung/finanziell-absichern/antrag-bescheid"},
    {label:{es:"Bundesagentur für Arbeit · Formularios",de:"Bundesagentur für Arbeit · Formulare"},url:"https://www.arbeitsagentur.de/arbeitslos-arbeit-finden/downloads-arbeitslos-arbeit-finden"},
    {label:{es:"Berlin Service · Wohngeld Mietzuschuss (referencia municipal)",de:"Service Berlin · Wohngeld Mietzuschuss (kommunales Beispiel)"},url:"https://service.berlin.de/dienstleistung/120656/"},
    {label:{es:"Bundeszentralamt für Steuern · Nueva comunicación de Steuer-ID",de:"Bundeszentralamt für Steuern · Erneute Mitteilung Steuer-ID"},url:"https://www.elster.de/bportal/formulare-leistungen/alleformulare/idnr?locale=de_DE"},
    {label:{es:"Deutsche Rentenversicherung · Versicherungsnummernachweis",de:"Deutsche Rentenversicherung · Versicherungsnummernachweis"},url:"https://www.deutsche-rentenversicherung.de/DRV/DE/Rente/Allgemeine-Informationen/Sozialversicherungsausweis/Sozialversicherungsausweis.html"}
  ]
};


APP_DATA.assistantQuestions = [
  {
    "id": "target",
    "type": "single",
    "title": {
      "es": "¿Qué quieres aclarar o solicitar?",
      "de": "Was soll geklärt oder beantragt werden?"
    },
    "help": {
      "es": "Si no lo sabes, el asistente propone un siguiente paso sin decidir jurídicamente el derecho.",
      "de": "Wenn du es nicht weißt, schlägt der Assistent einen nächsten Schritt vor, ohne einen Rechtsanspruch zu entscheiden."
    },
    "options": [
      {
        "value": "unknown",
        "label": {
          "es": "No lo sé todavía",
          "de": "Noch unklar"
        },
        "desc": {
          "es": "Comparar las dos rutas",
          "de": "Beide Wege vergleichen"
        }
      },
      {
        "value": "grundsicherung",
        "label": {
          "es": "Grundsicherungsgeld",
          "de": "Grundsicherungsgeld"
        },
        "desc": {
          "es": "Jobcenter · antes Bürgergeld",
          "de": "Jobcenter · vormals Bürgergeld"
        }
      },
      {
        "value": "wohngeld",
        "label": {
          "es": "Wohngeld",
          "de": "Wohngeld"
        },
        "desc": {
          "es": "Ayuda con los gastos de vivienda",
          "de": "Zuschuss zu Wohnkosten"
        }
      }
    ]
  },
  {
    "id": "housing",
    "type": "single",
    "title": {
      "es": "¿Cómo vive la persona actualmente?",
      "de": "Wie wohnt die Person aktuell?"
    },
    "help": {
      "es": "Esto decide qué datos de vivienda son relevantes.",
      "de": "Davon hängt ab, welche Wohnkostenangaben relevant sind."
    },
    "options": [
      {
        "value": "rent",
        "label": {
          "es": "Alquiler / subalquiler",
          "de": "Miete / Untermiete"
        }
      },
      {
        "value": "owner",
        "label": {
          "es": "Vivienda propia",
          "de": "Wohneigentum"
        }
      },
      {
        "value": "temporary",
        "label": {
          "es": "Alojamiento temporal / sin vivienda fija",
          "de": "Unterkunft / kein fester Wohnsitz"
        }
      }
    ]
  },
  {
    "id": "household",
    "type": "multi",
    "title": {
      "es": "¿Con quién vive?",
      "de": "Mit wem lebt die Person zusammen?"
    },
    "help": {
      "es": "Marca todas las opciones aplicables. 'Solo/a' borra las demás.",
      "de": "Alle zutreffenden Optionen wählen. 'Allein' schließt die anderen aus."
    },
    "exclusive": [
      "alone"
    ],
    "options": [
      {
        "value": "alone",
        "label": {
          "es": "Solo/a",
          "de": "Allein"
        }
      },
      {
        "value": "partner",
        "label": {
          "es": "Pareja / cónyuge",
          "de": "Partner/in / Ehegatte"
        }
      },
      {
        "value": "child_u15",
        "label": {
          "es": "Niño/a menor de 15",
          "de": "Kind unter 15"
        }
      },
      {
        "value": "child_15_24",
        "label": {
          "es": "Hijo/a 15–24, soltero/a",
          "de": "Unverheiratetes Kind 15–24"
        }
      },
      {
        "value": "relatives",
        "label": {
          "es": "Otros familiares",
          "de": "Andere Verwandte"
        }
      },
      {
        "value": "wg",
        "label": {
          "es": "WG / personas no familiares",
          "de": "WG / nicht verwandte Personen"
        }
      }
    ]
  },
  {
    "id": "citizenship",
    "type": "single",
    "title": {
      "es": "¿Qué situación de nacionalidad tiene?",
      "de": "Welche Staatsangehörigkeitssituation liegt vor?"
    },
    "help": {
      "es": "La lengua española no significa automáticamente ciudadanía española o de la UE.",
      "de": "Spanische Sprache bedeutet nicht automatisch spanische oder EU-Staatsangehörigkeit."
    },
    "options": [
      {
        "value": "german",
        "label": {
          "es": "Alemana",
          "de": "Deutsch"
        }
      },
      {
        "value": "eu",
        "label": {
          "es": "UE/EEE/Suiza",
          "de": "EU/EWR/Schweiz"
        }
      },
      {
        "value": "non_eu",
        "label": {
          "es": "Tercer país / no UE",
          "de": "Drittstaat / nicht EU"
        }
      },
      {
        "value": "unknown",
        "label": {
          "es": "No está claro",
          "de": "Unklar"
        }
      }
    ]
  },
  {
    "id": "workability",
    "type": "single",
    "title": {
      "es": "¿Puede trabajar normalmente al menos 3 horas al día?",
      "de": "Kann die Person grundsätzlich mindestens 3 Stunden täglich arbeiten?"
    },
    "help": {
      "es": "Esta pregunta es importante para la ruta del Jobcenter. No sustituye una valoración médica.",
      "de": "Diese Frage ist für den Jobcenter-Weg wichtig und ersetzt keine medizinische Beurteilung."
    },
    "options": [
      {
        "value": "yes",
        "label": {
          "es": "Sí",
          "de": "Ja"
        }
      },
      {
        "value": "no",
        "label": {
          "es": "No",
          "de": "Nein"
        }
      },
      {
        "value": "unknown",
        "label": {
          "es": "No está claro",
          "de": "Unklar"
        }
      }
    ]
  },
  {
    "id": "income",
    "type": "multi",
    "title": {
      "es": "¿Qué ingresos existen actualmente?",
      "de": "Welche aktuellen Einnahmen gibt es?"
    },
    "help": {
      "es": "Marca todas las opciones. 'Ninguno' borra las demás.",
      "de": "Alle zutreffenden Optionen wählen. 'Keine' schließt die anderen aus."
    },
    "exclusive": [
      "none"
    ],
    "options": [
      {
        "value": "employment",
        "label": {
          "es": "Salario / Minijob",
          "de": "Arbeitslohn / Minijob"
        }
      },
      {
        "value": "self_employed",
        "label": {
          "es": "Trabajo autónomo",
          "de": "Selbständig / freiberuflich"
        }
      },
      {
        "value": "alg1",
        "label": {
          "es": "Arbeitslosengeld I",
          "de": "Arbeitslosengeld I"
        }
      },
      {
        "value": "pension",
        "label": {
          "es": "Pensión / Rente",
          "de": "Rente / Pension"
        }
      },
      {
        "value": "other",
        "label": {
          "es": "Otros ingresos",
          "de": "Andere Einnahmen"
        }
      },
      {
        "value": "none",
        "label": {
          "es": "Ningún ingreso",
          "de": "Keine Einnahmen"
        }
      }
    ]
  },
  {
    "id": "housing_transfer",
    "type": "single",
    "title": {
      "es": "¿Recibe ya una prestación que incluye los gastos de vivienda?",
      "de": "Wird bereits eine Leistung bezogen, die Unterkunftskosten berücksichtigt?"
    },
    "help": {
      "es": "Esto es especialmente importante antes de recomendar Wohngeld.",
      "de": "Das ist besonders wichtig, bevor Wohngeld empfohlen wird."
    },
    "options": [
      {
        "value": "no",
        "label": {
          "es": "No",
          "de": "Nein"
        }
      },
      {
        "value": "sgb2",
        "label": {
          "es": "Grundsicherungsgeld / Bürgergeld",
          "de": "Grundsicherungsgeld / Bürgergeld"
        }
      },
      {
        "value": "sgb12",
        "label": {
          "es": "Sozialhilfe / Grundsicherung SGB XII",
          "de": "Sozialhilfe / Grundsicherung SGB XII"
        }
      },
      {
        "value": "asyl",
        "label": {
          "es": "Asylbewerberleistungen",
          "de": "Asylbewerberleistungen"
        }
      },
      {
        "value": "unknown",
        "label": {
          "es": "No está claro",
          "de": "Unklar"
        }
      }
    ]
  },
  {
    "id": "education",
    "type": "single",
    "title": {
      "es": "¿Estudia o está en formación profesional?",
      "de": "Schule, Studium oder Ausbildung?"
    },
    "help": {
      "es": "BAföG/BAB puede afectar especialmente a Wohngeld y Grundsicherungsgeld.",
      "de": "BAföG/BAB kann insbesondere Wohngeld und Grundsicherungsgeld beeinflussen."
    },
    "options": [
      {
        "value": "none",
        "label": {
          "es": "No",
          "de": "Nein"
        }
      },
      {
        "value": "student",
        "label": {
          "es": "Escuela / universidad",
          "de": "Schule / Studium"
        }
      },
      {
        "value": "training",
        "label": {
          "es": "Ausbildung",
          "de": "Ausbildung"
        }
      },
      {
        "value": "unknown",
        "label": {
          "es": "No está claro",
          "de": "Unklar"
        }
      }
    ]
  },
  {
    "id": "special",
    "type": "multi",
    "title": {
      "es": "¿Hay alguna situación especial?",
      "de": "Gibt es eine besondere Lebenssituation?"
    },
    "help": {
      "es": "Estas respuestas activan anexos o comprobantes adicionales.",
      "de": "Diese Antworten aktivieren zusätzliche Anlagen oder Nachweise."
    },
    "options": [
      {
        "value": "separated",
        "label": {
          "es": "Separado/a o divorciado/a",
          "de": "Getrennt / geschieden"
         }
      },
      {
        "value": "pregnant",
        "label": {
          "es": "Embarazo",
          "de": "Schwangerschaft"
        }
      },
      {
        "value": "single_parent",
        "label": {
          "es": "Familia monoparental",
          "de": "Alleinerziehend"
        }
      },
      {
        "value": "special_diet",
        "label": {
          "es": "Dieta médica costosa",
          "de": "Kostenaufwändige Ernährung"
        }
      },
      {
        "value": "disability",
        "label": {
          "es": "Discapacidad / Pflegegrad",
          "de": "Behinderung / Pflegegrad"
        }
      },
      {
        "value": "special_need",
        "label": {
          "es": "Necesidad especial inevitable",
          "de": "Unabweisbarer besonderer Bedarf"
        }
      },
      {
        "value": "institution",
        "label": {
          "es": "Hospital / institución / prisión",
          "de": "Stationäre Einrichtung"
        }
      },
      {
        "value": "accident",
        "label": {
          "es": "Daño causado por otra persona",
          "de": "Unfall/Schaden durch Dritte"
        }
      },
      {
        "value": "under25_parent_outside",
        "label": {
          "es": "Menor de 25 y progenitor fuera de la BG",
          "de": "Unter 25, Elternteil außerhalb BG"
        }
      }
    ]
  },
  {
    "id": "history",
    "type": "multi",
    "title": {
      "es": "¿Qué ocurrió en los últimos años?",
      "de": "Was traf in den letzten Jahren zu?"
    },
    "help": {
      "es": "El Hauptantrag del Jobcenter pregunta por prestaciones de 3 años y situaciones de 5 años.",
      "de": "Der Jobcenter-Hauptantrag fragt nach Leistungsbezug der letzten 3 Jahre und Lebenssituationen der letzten 5 Jahre."
    },
    "options": [
      {
        "value": "benefits3y",
        "label": {
          "es": "Bürgergeld/Sozialhilfe últimos 3 años",
          "de": "Bürgergeld/Sozialhilfe letzte 3 Jahre"
        }
      },
      {
        "value": "employment5y",
        "label": {
          "es": "Empleo últimos 5 años",
          "de": "Beschäftigung letzte 5 Jahre"
        }
      },
      {
        "value": "self5y",
        "label": {
          "es": "Autónomo/a últimos 5 años",
          "de": "Selbständig letzte 5 Jahre"
        }
      },
      {
        "value": "replacement5y",
        "label": {
          "es": "ALG/Krankengeld/etc. últimos 5 años",
          "de": "ALG/Krankengeld usw. letzte 5 Jahre"
        }
      },
      {
        "value": "care5y",
        "label": {
          "es": "Cuidado de familiares",
          "de": "Angehörige gepflegt"
        }
      },
      {
        "value": "service5y",
        "label": {
          "es": "Servicio voluntario/militar",
          "de": "Freiwilligen-/Wehrdienst"
        }
      }
    ]
  }
];
APP_DATA.formMaps = {
  "grundsicherung": {
    "title": {
      "es": "Preparación de formularios Jobcenter",
      "de": "Formularvorbereitung Jobcenter"
    },
    "forms": [
      {
        "id": "HA",
        "title": {
          "es": "HA · Hauptantrag 04/2026",
          "de": "HA · Hauptantrag 04/2026"
        },
        "source": "https://www.arbeitsagentur.de/datei/antrag-sgb2_ba042689.pdf",
        "fields": [
          {
            "no": "1",
            "title": {
              "es": "Nombre",
              "de": "Vorname"
            },
            "when": "always"
          },
          {
            "no": "2",
            "title": {
              "es": "Apellido(s)",
              "de": "Nachname"
            },
            "when": "always"
          },
          {
            "no": "3",
            "title": {
              "es": "Fecha de nacimiento",
              "de": "Geburtsdatum"
            },
            "when": "always"
          },
          {
            "no": "4",
            "title": {
              "es": "Apellido de nacimiento / anterior",
              "de": "Geburtsname / früherer Name"
            },
            "when": "always"
          },
          {
            "no": "5",
            "title": {
              "es": "Lugar de nacimiento",
              "de": "Geburtsort"
            },
            "when": "always"
          },
          {
            "no": "6",
            "title": {
              "es": "País de nacimiento",
              "de": "Geburtsland"
            },
            "when": "always"
          },
          {
            "no": "7",
            "title": {
              "es": "Nacionalidad",
              "de": "Staatsangehörigkeit"
            },
            "when": "always"
          },
          {
            "no": "8",
            "title": {
              "es": "Sexo",
              "de": "Geschlecht"
            },
            "when": "always"
          },
          {
            "no": "9–12",
            "title": {
              "es": "Dirección actual: calle, número, CP, ciudad",
              "de": "Aktuelle Anschrift: Straße, Hausnr., PLZ, Ort"
            },
            "when": "always"
          },
          {
            "no": "14",
            "title": {
              "es": "Teléfono (voluntario)",
              "de": "Telefon (freiwillig)"
            },
            "when": "always"
          },
          {
            "no": "15–16",
            "title": {
              "es": "Sin domicilio fijo / alojado en otra persona o institución",
              "de": "Kein fester Wohnsitz / wohnhaft bei"
            },
            "when": "temporary"
          },
          {
            "no": "17",
            "title": {
              "es": "Titular de cuenta",
              "de": "Kontoinhaber/in"
            },
            "when": "always"
          },
          {
            "no": "18",
            "title": {
              "es": "IBAN",
              "de": "IBAN"
            },
            "when": "always",
            "helpDoc": "iban"
          },
          {
            "no": "19",
            "title": {
              "es": "Motivo si no puede indicar cuenta",
              "de": "Grund, wenn kein Basiskonto angegeben werden kann"
            },
            "when": "no_bank"
          },
          {
            "no": "20",
            "title": {
              "es": "Renten-/Sozialversicherungsnummer",
              "de": "Renten-/Sozialversicherungsnummer"
            },
            "when": "always",
            "helpDoc": "social_insurance"
          },
          {
            "no": "21",
            "title": {
              "es": "Steuer-ID",
              "de": "Steuer-ID"
            },
            "when": "always",
            "helpDoc": "tax_id"
          },
          {
            "no": "22",
            "title": {
              "es": "Tutor/a, representante o apoderado/a",
              "de": "Betreuer/in, Bevollmächtigte/r oder Vormund"
            },
            "when": "always"
          },
          {
            "no": "23",
            "title": {
              "es": "Aufenthaltstitel válido",
              "de": "Gültiger Aufenthaltstitel"
            },
            "when": "foreign"
          },
          {
            "no": "24–25",
            "title": {
              "es": "Asylbewerberleistungen y fecha final",
              "de": "Asylbewerberleistungen und Enddatum"
            },
            "when": "asyl"
          },
          {
            "no": "26",
            "title": {
              "es": "AZR-Nummer, si existe",
              "de": "AZR-Nummer, falls vorhanden"
            },
            "when": "foreign"
          },
          {
            "no": "27",
            "title": {
              "es": "Verpflichtungserklärung",
              "de": "Verpflichtungserklärung"
            },
            "when": "foreign"
          },
          {
            "no": "28",
            "title": {
              "es": "Número nacional de identificación del país de origen",
              "de": "Nationale Personenidentifikationsnummer"
            },
            "when": "foreign"
          },
          {
            "no": "29–30",
            "title": {
              "es": "Fecha desde la que se solicita la prestación",
              "de": "Zeitpunkt der Antragstellung"
            },
            "when": "always"
          },
          {
            "no": "31",
            "title": {
              "es": "Fecha de entrada en Alemania si vivió antes en el extranjero",
              "de": "Einreisedatum nach Deutschland, wenn zuvor im Ausland gelebt"
            },
            "when": "foreign"
          },
          {
            "no": "32–33",
            "title": {
              "es": "Estado civil y, si procede, fecha de separación/divorcio",
              "de": "Familienstand und ggf. Trennungs-/Scheidungsdatum"
            },
            "when": "always"
          },
          {
            "no": "34",
            "title": {
              "es": "Capacidad para trabajar al menos 3 horas/día",
              "de": "Erwerbsfähigkeit mindestens 3 Stunden täglich"
            },
            "when": "always"
          },
          {
            "no": "35",
            "title": {
              "es": "Familia monoparental",
              "de": "Alleinerziehend"
            },
            "when": "always"
          },
          {
            "no": "36–37",
            "title": {
              "es": "Embarazo / fecha probable del parto",
              "de": "Schwangerschaft / voraussichtlicher Entbindungstermin"
            },
            "when": "pregnant"
          },
          {
            "no": "38",
            "title": {
              "es": "Menor de 25 con progenitor fuera de la BG",
              "de": "Unter 25 mit Elternteil außerhalb BG"
            },
            "when": "under25_parent_outside"
          },
          {
            "no": "39–41",
            "title": {
              "es": "Escuela, universidad o Ausbildung y costes relacionados",
              "de": "Schule, Studium oder Ausbildung und damit verbundene Angaben"
            },
            "when": "education"
          },
          {
            "no": "42–43",
            "title": {
              "es": "Otras prestaciones solicitadas o previstas",
              "de": "Andere beantragte/beabsichtigte Leistungen"
            },
            "when": "always"
          },
          {
            "no": "44",
            "title": {
              "es": "Dieta médica costosa",
              "de": "Kostenaufwändige Ernährung"
            },
            "when": "special_diet"
          },
          {
            "no": "45–46",
            "title": {
              "es": "Discapacidad y prestaciones de participación",
              "de": "Behinderung und Teilhabeleistungen"
            },
            "when": "disability"
          },
          {
            "no": "47",
            "title": {
              "es": "Necesidad especial inevitable",
              "de": "Unabweisbarer besonderer Bedarf"
            },
            "when": "special_need"
          },
          {
            "no": "48–50",
            "title": {
              "es": "Estancia en institución y duración",
              "de": "Stationäre Einrichtung und Dauer"
            },
            "when": "institution"
          },
          {
            "no": "51–58",
            "title": {
              "es": "Bürgergeld/Sozialhilfe de los últimos 3 años: tipo, período y organismo",
              "de": "Bürgergeld/Sozialhilfe letzte 3 Jahre: Art, Zeitraum, Träger"
            },
            "when": "benefits3y"
          },
          {
            "no": "59–66",
            "title": {
              "es": "Empleos de los últimos 5 años y posibles salarios pendientes",
              "de": "Beschäftigungen letzte 5 Jahre und ggf. offene Lohnansprüche"
            },
            "when": "employment5y"
          },
          {
            "no": "67",
            "title": {
              "es": "Actividad autónoma en los últimos 5 años",
              "de": "Selbständigkeit/Freiberuflichkeit letzte 5 Jahre"
            },
            "when": "self_history_or_current"
          },
          {
            "no": "68–70",
            "title": {
              "es": "Prestaciones sustitutivas del salario y período",
              "de": "Entgeltersatzleistungen und Zeitraum"
            },
            "when": "replacement_or_alg1"
          },
          {
            "no": "71",
            "title": {
              "es": "Servicio militar/voluntario",
              "de": "Wehr-/Freiwilligendienst"
            },
            "when": "service5y"
          },
          {
            "no": "72",
            "title": {
              "es": "Cuidado de familiares",
              "de": "Angehörige gepflegt"
            },
            "when": "care5y"
          },
          {
            "no": "73",
            "title": {
              "es": "Cómo se financió la vida si nada de 59–72 aplica",
              "de": "Lebensunterhalt, falls 59–72 nicht zutreffen"
            },
            "when": "history_empty"
          },
          {
            "no": "74",
            "title": {
              "es": "Derechos frente a terceros, p. ej. herencia/indemnización",
              "de": "Ansprüche gegenüber Dritten, z. B. Erbschaft/Schadensersatz"
            },
            "when": "always"
          },
          {
            "no": "75",
            "title": {
              "es": "Accidente/daño causado por tercero",
              "de": "Unfall/gesundheitlicher Schaden durch Dritte"
            },
            "when": "accident"
          },
          {
            "no": "76",
            "title": {
              "es": "Seguro médico/pflege gesetzlich familiar u obligatorio",
              "de": "Gesetzliche Kranken-/Pflegeversicherung familien- oder pflichtversichert"
            },
            "when": "always"
          },
          {
            "no": "77",
            "title": {
              "es": "Nombre de la Krankenkasse",
              "de": "Name der Krankenkasse"
            },
            "when": "always",
            "helpDoc": "health_insurance"
          },
          {
            "no": "78",
            "title": {
              "es": "Privado, voluntario o sin seguro",
              "de": "Privat, freiwillig gesetzlich oder nicht versichert"
            },
            "when": "always"
          },
          {
            "no": "79",
            "title": {
              "es": "¿Vive solo/a?",
              "de": "Wohnen Sie allein?"
            },
            "when": "always"
          },
          {
            "no": "80",
            "title": {
              "es": "Personas con las que vive",
              "de": "Mit welchen Personen wird zusammengewohnt?"
            },
            "when": "not_alone"
          },
          {
            "no": "81",
            "title": {
              "es": "¿Tiene gastos de alojamiento y calefacción?",
              "de": "Bedarfe für Unterkunft und Heizung?"
            },
            "when": "always"
          }
        ]
      },
      {
        "id": "KDU",
        "title": {
          "es": "KDU · Alojamiento y calefacción 04/2026",
          "de": "KDU · Unterkunft und Heizung 04/2026"
        },
        "source": "https://www.arbeitsagentur.de/datei/anlagekdu_ba032980.pdf",
        "fields": [
          {
            "no": "1–4",
            "title": {
              "es": "Datos personales y BG-Nummer",
              "de": "Personendaten und BG-Nummer"
            },
            "when": "always"
          },
          {
            "no": "5–8",
            "title": {
              "es": "Dirección de la vivienda",
              "de": "Adresse der Unterkunft"
            },
            "when": "always"
          },
          {
            "no": "9",
            "title": {
              "es": "Número de personas en la vivienda",
              "de": "Anzahl Personen in der Unterkunft"
            },
            "when": "always"
          },
          {
            "no": "10",
            "title": {
              "es": "Año de construcción, si se conoce",
              "de": "Baujahr, falls bekannt"
            },
            "when": "always"
          },
          {
            "no": "11–13",
            "title": {
              "es": "Número de habitaciones, cocinas y baños",
              "de": "Anzahl Räume, Küchen, Bäder"
            },
            "when": "always"
          },
          {
            "no": "14–18",
            "title": {
              "es": "Superficie total y partes usadas/alquiladas/vacías/comerciales",
              "de": "Gesamtfläche und selbst genutzte/vermietete/leere/gewerbliche Anteile"
            },
            "when": "always"
          },
          {
            "no": "19",
            "title": {
              "es": "Alquiler u propiedad",
              "de": "Miete oder Eigentum"
            },
            "when": "always"
          },
          {
            "no": "20",
            "title": {
              "es": "Alquiler base, Nebenkosten, Heizkosten o Pauschalmiete",
              "de": "Grundmiete, Nebenkosten, Heizkosten oder Pauschalmiete"
            },
            "when": "rent"
          },
          {
            "no": "21–23",
            "title": {
              "es": "Datos y costes de vivienda propia",
              "de": "Angaben und Kosten bei Wohneigentum"
            },
            "when": "owner"
          },
          {
            "no": "24",
            "title": {
              "es": "Combustible: electricidad/gas/fuel/fernwärme/madera/otro",
              "de": "Brennstoff: Strom/Gas/Heizöl/Fernwärme/Holz/sonstiges"
            },
            "when": "always"
          },
          {
            "no": "25",
            "title": {
              "es": "¿Compra el combustible por su cuenta?",
              "de": "Brennstoff selbst beschafft?"
            },
            "when": "always"
          },
          {
            "no": "26",
            "title": {
              "es": "Tipo de calefacción",
              "de": "Art der Heizung"
            },
            "when": "always"
          },
          {
            "no": "27",
            "title": {
              "es": "Energía para cocinar",
              "de": "Energiequelle zum Kochen"
            },
            "when": "always"
          },
          {
            "no": "28–29",
            "title": {
              "es": "Agua caliente central/descentral y energía",
              "de": "Warmwasser zentral/dezentral und Energiequelle"
            },
            "when": "always"
          },
          {
            "no": "30–36",
            "title": {
              "es": "Pago directo al propietario: sí/no y datos/IBAN",
              "de": "Direktzahlung an Vermieter: ja/nein und Daten/IBAN"
            },
            "when": "rent"
          }
        ]
      },
      {
        "id": "EK",
        "title": {
          "es": "EK · Ingresos 04/2026",
          "de": "EK · Einkommen 04/2026"
        },
        "source": "https://www.arbeitsagentur.de/datei/anlageek_ba032960.pdf",
        "fields": [
          {
            "no": "1–7",
            "title": {
              "es": "Datos del solicitante y de la persona del anexo",
              "de": "Daten Antragsteller/in und Person der Anlage"
            },
            "when": "always"
          },
          {
            "no": "8",
            "title": {
              "es": "Ingresos por trabajo",
              "de": "Einkommen aus Erwerbstätigkeit"
            },
            "when": "always"
          },
          {
            "no": "9–20",
            "title": {
              "es": "Datos de hasta dos empleadores y momento del pago",
              "de": "Daten von bis zu zwei Arbeitgebern und Zahlungszeitpunkt"
            },
            "when": "employment"
          },
          {
            "no": "21",
            "title": {
              "es": "Actividad autónoma/freiberuflich",
              "de": "Selbständige/freiberufliche Tätigkeit"
            },
            "when": "self_current"
          },
          {
            "no": "22",
            "title": {
              "es": "Compensaciones por actividad voluntaria",
              "de": "Aufwandsentschädigungen aus Ehrenamt"
            },
            "when": "always"
          },
          {
            "no": "23",
            "title": {
              "es": "Todas las otras entradas: ALG, Krankengeld, Elterngeld, Kindergeld, Unterhalt, BAföG, Rente, alquileres, plataformas, etc.",
              "de": "Alle weiteren Einnahmen: ALG, Krankengeld, Elterngeld, Kindergeld, Unterhalt, BAföG, Rente, Vermietung, Plattformen usw."
            },
            "when": "always"
          },
          {
            "no": "24–32",
            "title": {
              "es": "Gastos de desplazamiento al trabajo",
              "de": "Fahrtkosten zwischen Wohnung und Arbeitsstätte"
            },
            "when": "employment"
          },
          {
            "no": "33",
            "title": {
              "es": "Otros gastos laborales no reembolsados",
              "de": "Weitere nicht erstattete Ausgaben aus Arbeitsverhältnis"
            },
            "when": "employment"
          },
          {
            "no": "34",
            "title": {
              "es": "Seguros que pueden ser deducibles",
              "de": "Mögliche Versicherungsbeiträge/Absetzungen"
            },
            "when": "always"
          },
          {
            "no": "35–37",
            "title": {
              "es": "Hijos fuera del hogar, Unterhalt, formación con ingresos parentales",
              "de": "Kinder außerhalb Haushalt, Unterhalt, Ausbildungsförderung mit Elterneinkommen"
            },
            "when": "always"
          }
        ]
      },
      {
        "id": "VM",
        "title": {
          "es": "VM · Patrimonio 04/2026",
          "de": "VM · Vermögen 04/2026"
        },
        "source": "https://www.arbeitsagentur.de/datei/anlagevm_ba033055.pdf",
        "fields": [
          {
            "no": "1–4",
            "title": {
              "es": "Datos personales y BG-Nummer",
              "de": "Personendaten und BG-Nummer"
            },
            "when": "always"
          },
          {
            "no": "5–11",
            "title": {
              "es": "Inmuebles y terrenos, también en el extranjero",
              "de": "Immobilien und Grundstücke, auch im Ausland"
            },
            "when": "always"
          },
          {
            "no": "12–13",
            "title": {
              "es": "Vehículos",
              "de": "Kraftfahrzeuge"
            },
            "when": "always"
          },
          {
            "no": "14–17",
            "title": {
              "es": "Donaciones/transferencias de patrimonio de los últimos 10 años",
              "de": "Schenkungen/Spenden/Übertragungen letzte 10 Jahre"
            },
            "when": "always"
          },
          {
            "no": "18",
            "title": {
              "es": "Efectivo",
              "de": "Bargeld"
            },
            "when": "always"
          },
          {
            "no": "19",
            "title": {
              "es": "Cuentas, tarjetas, PayPal y otras cuentas online",
              "de": "Konten, Kreditkartenkonten, PayPal und weitere Online-Konten"
            },
            "when": "always"
          },
          {
            "no": "20",
            "title": {
              "es": "Ahorros, Tagesgeld, Sparbuch",
              "de": "Spareinlagen, Tagesgeld, Sparbuch"
            },
            "when": "always"
          },
          {
            "no": "21",
            "title": {
              "es": "Acciones, fondos, criptomonedas y otros valores",
              "de": "Aktien, Fonds, Kryptowährungen und sonstige Wertpapiere"
            },
            "when": "always"
          },
          {
            "no": "22",
            "title": {
              "es": "Bausparverträge",
              "de": "Bausparverträge"
            },
            "when": "always"
          },
          {
            "no": "23",
            "title": {
              "es": "Patrimonio para jubilación",
              "de": "Altersvorsorgevermögen"
            },
            "when": "always"
          },
          {
            "no": "24",
            "title": {
              "es": "Seguros con devolución de primas",
              "de": "Versicherungen mit Prämienrückgewähr"
            },
            "when": "always"
          },
          {
            "no": "25",
            "title": {
              "es": "Otros bienes: metales, joyas, antigüedades, arte",
              "de": "Sonstiges Vermögen: Edelmetalle, Schmuck, Antiquitäten, Kunst"
            },
            "when": "always"
          },
          {
            "no": "26–31",
            "title": {
              "es": "Datos adicionales si hubo actividad autónoma",
              "de": "Zusatzangaben bei Selbständigkeit"
            },
            "when": "self_history_or_current"
          }
        ]
      }
    ]
  },
  "wohngeld": {
    "title": {
      "es": "Preparación del Mietzuschuss Berlin",
      "de": "Vorbereitung Mietzuschuss Berlin"
    },
    "forms": [
      {
        "id": "WG",
        "title": {
          "es": "Wohngeldantrag Mietzuschuss · Berlin",
          "de": "Wohngeldantrag Mietzuschuss · Berlin"
        },
        "source": "https://www.berlin.de/sen/sbw/_assets/service/formular-center/bereich-wohnen/bauwohnwog1-1.pdf",
        "fields": [
          {
            "no": "1",
            "title": {
              "es": "Datos personales, estado civil y situación laboral",
              "de": "Persönliche Angaben, Familienstand und Erwerbsstatus"
            },
            "when": "always"
          },
          {
            "no": "2",
            "title": {
              "es": "Dirección de la vivienda y, si procede, fecha prevista de entrada",
              "de": "Anschrift der Wohnung und ggf. geplanter Einzug"
            },
            "when": "always"
          },
          {
            "no": "3",
            "title": {
              "es": "¿Vivienda subvencionada / Mietpreisbindung?",
              "de": "Öffentlich gefördert / Mietpreisbindung?"
            },
            "when": "rent"
          },
          {
            "no": "4–6",
            "title": {
              "es": "Personas del hogar: datos personales, parentesco y Erwerbsstatus",
              "de": "Haushaltsmitglieder: Personendaten, Verhältnis, Erwerbsstatus"
            },
            "when": "not_alone"
          },
          {
            "no": "7",
            "title": {
              "es": "Otras personas en la vivienda que no pertenecen al hogar, p. ej. WG",
              "de": "Weitere Personen, die nicht zum Haushalt gehören, z. B. WG"
            },
            "when": "wg"
          },
          {
            "no": "8",
            "title": {
              "es": "Fallecimiento de un miembro del hogar en los últimos 12 meses",
              "de": "Tod eines Haushaltsmitglieds in den letzten 12 Monaten"
            },
            "when": "always"
          },
          {
            "no": "9",
            "title": {
              "es": "Cambios previstos en el número de miembros / mudanza",
              "de": "Geplante Änderung der Haushaltsmitglieder / Umzug"
            },
            "when": "always"
          },
          {
            "no": "10",
            "title": {
              "es": "Transferleistungen actuales, solicitadas, suspendidas o recientemente denegadas",
              "de": "Aktuelle/beantragte/weggefallene/abgelehnte Transferleistungen"
            },
            "when": "always"
          },
          {
            "no": "11",
            "title": {
              "es": "¿Otra autoridad exigió solicitar Wohngeld?",
              "de": "Wurde durch eine andere Behörde zur Wohngeldantragstellung aufgefordert?"
            },
            "when": "always"
          },
          {
            "no": "12",
            "title": {
              "es": "Ingresos brutos de todas las personas y periodicidad; impuestos/seguros",
              "de": "Bruttoeinnahmen aller Haushaltsmitglieder und Turnus; Steuern/Versicherungen"
            },
            "when": "always"
          },
          {
            "no": "13",
            "title": {
              "es": "Werbungskosten superiores al Pauschbetrag / Minijob",
              "de": "Werbungskosten über Pauschbetrag / Minijob"
            },
            "when": "always"
          },
          {
            "no": "14",
            "title": {
              "es": "Gastos de cuidado infantil",
              "de": "Kinderbetreuungskosten"
            },
            "when": "children"
          },
          {
            "no": "15",
            "title": {
              "es": "Schwerbehinderung, Pflegegrad o condición especial BEG",
              "de": "Schwerbehinderung, Pflegegrad oder BEG-Status"
            },
            "when": "disability"
          },
          {
            "no": "16",
            "title": {
              "es": "Unterhalt pagado",
              "de": "Gezahlter Unterhalt"
            },
            "when": "always"
          },
          {
            "no": "17",
            "title": {
              "es": "Derecho a Unterhalt aún no cobrado",
              "de": "Noch nicht durchgesetzter Unterhaltsanspruch"
            },
            "when": "always"
          },
          {
            "no": "18",
            "title": {
              "es": "Ingresos únicos de los últimos/próximos 12 meses",
              "de": "Einmalige Einnahmen letzte/nächste 12 Monate"
            },
            "when": "always"
          },
          {
            "no": "19",
            "title": {
              "es": "Cambios esperados de ingresos en los próximos 12 meses",
              "de": "Erwartete Einkommensänderungen in den nächsten 12 Monaten"
            },
            "when": "always"
          },
          {
            "no": "20",
            "title": {
              "es": "¿Patrimonio por encima de 60.000 € + 30.000 € por persona adicional?",
              "de": "Vermögen über 60.000 € + 30.000 € je weiterem Haushaltsmitglied?"
            },
            "when": "always"
          },
          {
            "no": "21",
            "title": {
              "es": "Tipo de relación con la vivienda (Hauptmieter, Untermieter, etc.)",
              "de": "Art des Wohnverhältnisses (Hauptmiete, Untermiete usw.)"
            },
            "when": "rent"
          },
          {
            "no": "22",
            "title": {
              "es": "Superficie de la vivienda",
              "de": "Wohnfläche"
            },
            "when": "rent"
          },
          {
            "no": "23",
            "title": {
              "es": "Importe total mensual pagado al arrendador",
              "de": "Gesamtmiete an Vermieter monatlich"
            },
            "when": "rent"
          },
          {
            "no": "24",
            "title": {
              "es": "Parentesco con el arrendador",
              "de": "Verwandtschaftsverhältnis zum Vermieter"
            },
            "when": "rent"
          },
          {
            "no": "25",
            "title": {
              "es": "Heizkosten incluidas y cuantía",
              "de": "Enthaltene Heizkosten und Höhe"
            },
            "when": "rent"
          },
          {
            "no": "26",
            "title": {
              "es": "Warmwasserkosten incluidas y cuantía",
              "de": "Enthaltene Warmwasserkosten und Höhe"
            },
            "when": "rent"
          },
          {
            "no": "27",
            "title": {
              "es": "Garaje/plaza y otros costes incluidos",
              "de": "Garage/Stellplatz und weitere enthaltene Kosten"
            },
            "when": "rent"
          },
          {
            "no": "28",
            "title": {
              "es": "Costes pagados a terceros y ayudas de terceros a la renta",
              "de": "Kosten an Dritte und Mietanteile durch Dritte"
            },
            "when": "rent"
          },
          {
            "no": "29",
            "title": {
              "es": "Uso comercial/subarriendo/otras personas y cantidades",
              "de": "Gewerbliche Nutzung/Untervermietung/Mitbewohnen und Entgelte"
            },
            "when": "rent"
          },
          {
            "no": "30",
            "title": {
              "es": "Destinatario del Wohngeld y cuenta bancaria",
              "de": "Empfänger des Wohngelds und Bankverbindung"
            },
            "when": "always"
          },
          {
            "no": "31",
            "title": {
              "es": "Consentimiento sobre archivo de extractos bancarios / cierre del formulario",
              "de": "Einwilligung zur Aktennahme von Kontoauszügen / Abschluss"
            },
            "when": "always"
          }
        ]
      }
    ]
  }
};
APP_DATA.annexRules = {
  "base": [
    "VM",
    "EK"
  ],
  "rent": [
    "KDU"
  ],
  "partner": [
    "WEP"
  ],
  "child_u15": [
    "KI"
  ],
  "child_15_24": [
    "WEP"
  ],
  "relatives": [
    "HG"
  ],
  "wg": [
    "VE"
  ],
  "self_employed": [
    "EKS"
  ],
  "separated": [
    "UH1"
  ],
  "pregnant": [
    "UH2"
  ],
  "under25_parent_outside": [
    "UH3"
  ],
  "special_diet": [
    "MEB"
  ],
  "special_need": [
    "BB"
  ],
  "accident": [
    "UF"
  ]
};
APP_DATA.sources.push(... [
  {
    "label": {
      "es": "HA 04/2026 · Hauptantrag oficial",
      "de": "HA 04/2026 · offizieller Hauptantrag"
    },
    "url": "https://www.arbeitsagentur.de/datei/antrag-sgb2_ba042689.pdf"
  },
  {
    "label": {
      "es": "KDU 04/2026 · vivienda y calefacción",
      "de": "KDU 04/2026 · Unterkunft und Heizung"
    },
    "url": "https://www.arbeitsagentur.de/datei/anlagekdu_ba032980.pdf"
  },
  {
    "label": {
      "es": "EK 04/2026 · ingresos",
      "de": "EK 04/2026 · Einkommen"
    },
    "url": "https://www.arbeitsagentur.de/datei/anlageek_ba032960.pdf"
  },
  {
    "label": {
      "es": "VM 04/2026 · patrimonio",
      "de": "VM 04/2026 · Vermögen"
    },
    "url": "https://www.arbeitsagentur.de/datei/anlagevm_ba033055.pdf"
  },
  {
    "label": {
      "es": "Berlin · formulario Mietzuschuss",
      "de": "Berlin · Mietzuschussformular"
    },
    "url": "https://www.berlin.de/sen/sbw/_assets/service/formular-center/bereich-wohnen/bauwohnwog1-1.pdf"
  }
]);

// v0.3: lokale Dokumentanalyse. Die Dokumentdateien selbst werden nicht in localStorage gespeichert.
APP_DATA.documentTypes = [
  {id:"id_document", icon:"🪪", title:{es:"Documento de identidad",de:"Ausweisdokument"}, keys:["documento nacional de identidad","dni","personalausweis","reisepass","passport","nacionalidad","nationality card"]},
  {id:"health_insurance", icon:"💳", title:{es:"Tarjeta / seguro médico",de:"Gesundheitskarte / Krankenversicherung"}, keys:["gesundheitskarte","krankenkasse","versichertennummer","krankenversicherungskarte","europäische krankenversicherungskarte","kaufmännische krankenkasse","techniker krankenkasse","barmer","aok"]},
  {id:"bank_card", icon:"💳", title:{es:"Tarjeta bancaria / cuenta",de:"Bankkarte / Kontodaten"}, keys:["girocard","debit","credit","visa","mastercard","iban","bic","karteninhaber","cardholder","kontoinhaber"]},
  {id:"audio_note", icon:"🎙️", title:{es:"Grabación local",de:"Lokale Audioaufnahme"}, keys:["audio","aufnahme","grabación","transkript"]},
  {id:"registration", icon:"📍", title:{es:"Meldebescheinigung",de:"Meldebescheinigung"}, keys:["meldebescheinigung","meldebestätigung","meldebehörde","anmeldung bezieht sich","einzug am"]},
  {id:"rental_contract", icon:"📄", title:{es:"Contrato de alquiler",de:"Mietvertrag"}, keys:["mietvertrag","mietzins","nettokaltmiete","betriebskostenvorauszahlung","heizkostenvorauszahlung","mietsache"]},
  {id:"income_proof", icon:"💶", title:{es:"Nómina / Einkommensnachweis",de:"Lohnabrechnung / Einkommensnachweis"}, keys:["lohnabrechnung","gehaltsabrechnung","brutto","netto","steuer-id","sv-nr","abrechnungsmonat"]},
  {id:"bank_statements", icon:"📊", title:{es:"Kontoauszug",de:"Kontoauszug"}, keys:["kontoauszug","kontostand","saldo","buchungstag","wertstellung","iban"]},
  {id:"tax_id", icon:"🔢", title:{es:"Carta Steuer-ID",de:"Steuer-ID-Schreiben"}, keys:["identifikationsnummer","bundeszentralamt für steuern","steuerliche identifikationsnummer"]},
  {id:"social_insurance", icon:"🧩", title:{es:"Rentenversicherung / SV",de:"Rentenversicherung / SV-Nachweis"}, keys:["deutsche rentenversicherung","versicherungsnummernachweis","sozialversicherungsausweis","versicherungsnummer"]},
  {id:"previous_benefits", icon:"📬", title:{es:"Bescheid Jobcenter / prestación",de:"Jobcenter-/Leistungsbescheid"}, keys:["jobcenter","bewilligungsbescheid","bedarfsgemeinschaft","bürgergeld","grundsicherungsgeld","leistungsbescheid"]},
  {id:"alg1_notice", icon:"🏛️", title:{es:"Bescheid Arbeitslosengeld",de:"Arbeitslosengeld-Bescheid"}, keys:["agentur für arbeit","arbeitslosengeld","bewilligungsbescheid","leistungsbetrag"]},
  {id:"wohngeld_notice", icon:"🏠", title:{es:"Wohngeld-Bescheid",de:"Wohngeld-Bescheid"}, keys:["wohngeld","mietzuschuss","wohngeldbehörde","wohngeldbescheid"]},
  {id:"other", icon:"📎", title:{es:"Otro documento",de:"Sonstiges Dokument"}, keys:[]}
];

APP_DATA.factLabels = {
  firstName:{es:"Nombre",de:"Vorname"}, lastName:{es:"Apellido(s)",de:"Nachname"},
  birthDate:{es:"Fecha de nacimiento",de:"Geburtsdatum"}, birthPlace:{es:"Lugar de nacimiento",de:"Geburtsort"},
  birthCountry:{es:"País de nacimiento",de:"Geburtsland"}, nationality:{es:"Nacionalidad",de:"Staatsangehörigkeit"},
  taxId:{es:"Steuer-ID",de:"Steuer-ID"}, rvNumber:{es:"Renten-/SV-Nummer",de:"Renten-/SV-Nummer"},
  iban:{es:"IBAN",de:"IBAN"}, bic:{es:"BIC / SWIFT",de:"BIC / SWIFT"}, bankName:{es:"Banco",de:"Bank"}, accountHolder:{es:"Titular de cuenta",de:"Kontoinhaber/in"}, healthFund:{es:"Krankenkasse",de:"Krankenkasse"},
  healthInsuranceNo:{es:"Versichertennummer Krankenkasse",de:"Versichertennummer Krankenkasse"},
  streetAddress:{es:"Dirección",de:"Anschrift"}, livingArea:{es:"Superficie de vivienda",de:"Wohnfläche"},
  rentCold:{es:"Nettokaltmiete",de:"Nettokaltmiete"}, rentOperating:{es:"Betriebskosten",de:"Betriebskosten"},
  rentHeating:{es:"Heizkosten",de:"Heizkosten"}, rentTotal:{es:"Alquiler total",de:"Gesamtmiete"},
  contractStart:{es:"Inicio del contrato",de:"Vertragsbeginn"}, employmentStart:{es:"Inicio empleo",de:"Beschäftigungsbeginn"},
  employmentEnd:{es:"Fin empleo",de:"Beschäftigungsende"}, grossIncome:{es:"Brutto",de:"Bruttoeinkommen"},
  netIncome:{es:"Netto",de:"Nettoeinkommen"}, benefitAmount:{es:"Importe de prestación",de:"Leistungsbetrag"}
};

APP_DATA.factToForm = {
  firstName:[{form:"HA",no:"1"}], lastName:[{form:"HA",no:"2"}], birthDate:[{form:"HA",no:"3"}], accountHolder:[{form:"HA",no:"17"}], streetAddress:[{form:"HA",no:"9–12"}],
  birthPlace:[{form:"HA",no:"5"}], birthCountry:[{form:"HA",no:"6"}], nationality:[{form:"HA",no:"7"}],
  iban:[{form:"HA",no:"18"},{form:"WG",no:"30"}], rvNumber:[{form:"HA",no:"20"}], taxId:[{form:"HA",no:"21"}],
  healthFund:[{form:"HA",no:"77"}], livingArea:[{form:"KDU",no:"14–18"},{form:"WG",no:"22"}],
  rentCold:[{form:"KDU",no:"20"}], rentOperating:[{form:"KDU",no:"20"}], rentHeating:[{form:"KDU",no:"20"},{form:"WG",no:"25"}],
  rentTotal:[{form:"KDU",no:"20"},{form:"WG",no:"23"}], benefitAmount:[{form:"EK",no:"23"}], grossIncome:[{form:"EK",no:"8"}]
};

// --- v0.5: Bescheidanalyse -------------------------------------------------
// Zusaetzliche Angaben, die aus einem Bescheid gelesen werden koennen.
Object.assign(APP_DATA.factLabels, {
  caseNumber:{es:"Número de expediente",de:"Aktenzeichen / BG-Nummer"},
  customerNumber:{es:"Número de cliente",de:"Kundennummer"},
  noticeDate:{es:"Fecha del acto administrativo",de:"Bescheiddatum"},
  periodFrom:{es:"Periodo desde",de:"Bewilligung von"},
  periodTo:{es:"Periodo hasta",de:"Bewilligung bis"}
});

// Bescheide erhalten einen eigenen Dokumenttyp, damit die Fristenlogik greift.
APP_DATA.documentTypes.splice(APP_DATA.documentTypes.length-1, 0, {
  id:"notice_decision", icon:"⚖️",
  title:{es:"Resolución / Bescheid",de:"Bescheid"},
  keys:["bescheid","rechtsbehelfsbelehrung","widerspruch","bewilligungszeitraum",
        "wird bewilligt","wird abgelehnt","aufhebung","erstattung","widerspruchsbescheid",
        "sozialgericht","festgesetzt","leistungen nach dem sgb"]
});
