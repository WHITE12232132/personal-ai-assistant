export interface ColorScheme {
  // —— 基础层 ——
  background: string; // 页面底色
  surface: string; // 卡片/浮层，比 background 浮起来一层
  border: string; // 分割线、边框

  // —— 文字层（三级层次）——
  text: string; // 主文字
  textSecondary: string; // 次要文字
  textTertiary: string; // 最弱：占位符、角标

  // —— 品牌/语义色 ——
  primary: string; // 主题色（按钮、链接、高亮）
  primarySoft: string; // 主题色的"浅背景"变体（选中态底色）
  error: string;
  success: string;
  warning: string;

  // —— 场景层 ——
  codeBackground: string; // 代码块底色
  overlay: string; // 弹窗遮罩（半透明，用 rgba）
}

export const lightColors: ColorScheme = {
  background: '#ffffff',
  surface: '#f5f5f7',
  border: '#e5e5e7',

  text: '#111111',
  textSecondary: '#666666',
  textTertiary: '#999999',

  primary: '#0a84ff',
  primarySoft: '#e8f2ff',
  error: '#d70015',
  success: '#1c7c3c',
  warning: '#b25000',

  codeBackground: '#f5f5f7',
  overlay: 'rgba(0, 0, 0, 0.4)',
};

export const darkColors: ColorScheme = {
  background: '#000000',
  surface: '#1c1c1e',
  border: '#38383a',

  text: '#f2f2f7',
  textSecondary: '#a1a1a6',
  textTertiary: '#6e6e73',

  primary: '#0a84ff',
  primarySoft: '#0d2440',
  error: '#ff453a',
  success: '#32d74b',
  warning: '#ff9f0a',

  codeBackground: '#1c1c1e',
  overlay: 'rgba(0, 0, 0, 0.6)',
};
