declare global {
  interface Window {
    globalBannerAd?: any;
    globalBannerShowing?: boolean;
    globalBannerInitializing?: boolean;
  }
}

// 이미지 파일
declare module '*.png' { const src: string; export default src; }
declare module '*.jpg' { const src: string; export default src; }
declare module '*.jpeg' { const src: string; export default src; }
declare module '*.gif' { const src: string; export default src; }
declare module '*.webp' { const src: string; export default src; }
declare module '*.svg' { const src: string; export default src; }
declare module '*.ico' { const src: string; export default src; }

// 미디어·폰트 파일
declare module '*.mp4' { const src: string; export default src; }
declare module '*.mp3' { const src: string; export default src; }
declare module '*.woff' { const src: string; export default src; }
declare module '*.woff2' { const src: string; export default src; }
declare module '*.ttf' { const src: string; export default src; }
declare module '*.eot' { const src: string; export default src; }

// 타입 선언 없는 외부 라이브러리
declare module 'react-modal';

export {};
