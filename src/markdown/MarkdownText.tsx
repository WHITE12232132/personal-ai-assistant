import { Fragment } from 'react';
import { useMarkdown } from 'react-native-marked';
import { useTheme } from '@/theme';

export default function MarkdownText({ content }: { content: string }) {
    const { colors, isDark } = useTheme();

    const elements = useMarkdown(content, {
        colorScheme: isDark ? 'dark' : 'light',    // 库的默认配色跟着明暗走
        theme: {
            colors: {
                code: colors.codeBackground,       // 代码块底色
                link: colors.primary,              // 链接 = 主题色
                text: colors.text,                 // 正文
                border: colors.border,             // 表格/分割线边框
            },
        },
        styles: {
            codeText: { fontFamily: 'Menlo', fontSize: 13, color: colors.text },
            codespan: { fontFamily: 'Menlo', backgroundColor: colors.codeBackground },
        },
    });

    return (
        <>
            {elements.map((el, i) => (
                <Fragment key={i}>{el}</Fragment>
            ))}
        </>
    );
}