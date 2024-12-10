export type WebviewApp =
  | 'messenger'
  | 'facebook'
  | 'instagram'
  | 'twitter'
  | 'whatsapp'
  | 'linkedin'
  | 'snapchat'
  | 'pinterest'
  | 'tiktok'
  | 'google'
  | 'wechat'
  | 'naver';

export const WEBVIEW_APP_LABEL = {
  messenger: 'Messenger',
  facebook: 'Facebook',
  instagram: 'Instagram',
  twitter: 'Twitter',
  whatsapp: 'WhatsApp',
  linkedin: 'LinkedIn',
  snapchat: 'Snapchat',
  pinterest: 'Pinterest',
  tiktok: 'TikTok',
  google: 'Google',
  wechat: 'WeChat',
  naver: 'Naver',
} satisfies Record<WebviewApp, string>;

let webviewApp: Nullish<WebviewApp>;

export default function get3rdPartyWebviewFromUA(userAgent?: string | null): WebviewApp | null {
  if (webviewApp !== undefined) {
    return webviewApp;
  }

  const hasArg = !!userAgent;
  if (!userAgent) {
    if (typeof window === 'undefined') {
      return null;
    }

    userAgent = window.navigator.userAgent.toLowerCase();
  }

  const ua = userAgent.toLowerCase();
  let type: WebviewApp | null = null;
  if (ua.includes('fban/') || ua.includes('fbav/') || ua.includes('fb_iab')) {
    type = ua.includes('messenger')
      ? 'messenger'
      : 'facebook';
  } else if (ua.includes('gsa/')) {
    type = 'google';
  } else if (ua.includes('tiktok') || ua.includes('bytedance')) {
    type = 'tiktok';
  } else if (ua.includes('micromessenger')) {
    type = 'wechat';
  } else {
    for (const type2 of [
      'instagram',
      'twitter',
      'whatsapp',
      'linkedin',
      'snapchat',
      'pinterest',
      'naver',
    ]) {
      if (ua.includes(type2)) {
        type = type2 as WebviewApp;
        break;
      }
    }
  }

  if (!hasArg) {
    webviewApp = type;
  }
  return type;
}
