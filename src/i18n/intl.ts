import GLib from "gi://GLib?version=2.0";

const i18nKeys = {
  en_US: (await import("./lang/en_US")).default,
  fr_FR: (await import("./lang/fr_FR")).default,
  fr_BE: (await import("./lang/fr_FR")).default,
  pt_BR: (await import("./lang/pt_BR")).default,
  ru_RU: (await import("./lang/ru_RU")).default,
};

const languages: Array<string> = Object.keys(i18nKeys);
let language: string = getSystemLanguage();

export function getSystemLanguage(): string {
  const sysLanguage: string | null | undefined =
      GLib.getenv("LANG") ?? GLib.getenv("LANGUAGE"),
    splitted: Array<string> | undefined = sysLanguage?.split(".");

  if (!splitted || !languages.includes(splitted![0])) {
    console.warn(`Intl: Falling back to default \`${languages[0]}\``);
    return languages[0];
  }

  return splitted![0];
}

export function setLanguage(lang: string): string {
  languages.map((cur: string) => {
    if (cur === lang) {
      language = lang;
      return lang;
    }
  });

  throw new Error(`Intl: couldn't set language: ${lang}`, {
    cause: `language ${lang} not found in languages of type ${typeof languages}`,
  });
}

export function tr(key: string): string {
  let result = i18nKeys[language as keyof typeof i18nKeys],
    defResult = i18nKeys[languages[0] as keyof typeof i18nKeys];

  for (const keyString of key.split(".")) {
    result = result[keyString as keyof typeof result] as never;
    defResult = defResult[keyString as keyof typeof defResult] as never;
  }

  return typeof result == "string"
    ? result
    : typeof defResult == "string"
    ? defResult
    : 'not found / is not of type "string"';
}

export function trGet() {
  return i18nKeys[getSystemLanguage() as keyof typeof i18nKeys];
}
