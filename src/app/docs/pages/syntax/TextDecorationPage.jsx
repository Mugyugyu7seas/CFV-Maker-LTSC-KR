"use client";


import { TextPreset } from "../../../../../utils/store/Text";
import SyntaxGrid from "../../components/SyntaxLoader";
import { KEYWORDS } from "../../components/SyntaxLoader";
import { useTheme } from "../../../../../utils/ThemeProvider";
import { TextIcon } from "../../../../../components/Icon";

export default function SyntaxPage() {

  const { theme } = useTheme();
  const isDarkTheme = theme === 'dark';

  const t = TextPreset.TextDecorationPage;

  const textDecorationItems = [
    { code: "{", desc: t.descCurlyOpen, iconSrc: KEYWORDS["{"], dark: isDarkTheme },
    { code: "}", desc: t.descCurlyClose, iconSrc: KEYWORDS["}"], dark: isDarkTheme },
    {
      code: "__Underline__",
      desc: t.descUnderline,
      textEffect: 'underline'
    },
    {
      code: "*Gray Italic*",
      desc: t.descGrayItalic,
      textEffect: { italic: true, color: isDarkTheme ? '#c0c0c0' : '#858585' }
    },
    {
      code: "*__Gray Underline Italic__*",
      desc: t.descGrayUnderlineItalic,
      textEffect: { italic: true, underline: true, color: isDarkTheme ? '#c0c0c0' : '#858585' }
    },
    {
      code: '/*Red*/',
      desc: t.descRed,
      textEffect: 'red'
    },
    {
      code: "/**Red Italic**/",
      desc: t.descRedItalic,
      textEffect: { italic: true, color: '#ff0000' }
    },
    {
      code: '/*__Red Underline__*/',
      desc: t.descRedUnderline,
      textEffect: { underline: true, color: '#ff0000' }
    },
    {
      code: "/**__Red Underline Italic__**/",
      desc: t.descRedUnderlineItalic,
      textEffect: { italic: true, underline: true, color: '#ff0000' }
    },
    {
      code: "\\j Justify Line",
      desc: t.descJustify,
    },
  ];

  return (
    <>
      <div className="overflow-y-auto h-full custom-scrollbar p-8 pb-16">
        <h1 className="flex text-xl items-center gap-2 font-semibold mb-4 pb-1.5 border-b border-(--border-color)">
          <TextIcon size={24} />
          {t.TextDecoration}
        </h1>
        <SyntaxGrid items={textDecorationItems} columns={2} />
      </div>
    </>
  );
}