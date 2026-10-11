import { ThemeProvider } from "../../../utils/ThemeProvider";

export default function DocsLayout({ children }) {
  return (
    <ThemeProvider>
      <div className="flex-1 min-h-0 flex flex-col select-none">
        {children}
      </div>
    </ThemeProvider>
  );
}
