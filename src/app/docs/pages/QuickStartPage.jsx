import Link from 'next/link';

import { TextPreset } from '../../../../utils/store/Text';
import { FolderIcon, ArrowRightIcon, ImageIcon, ZipIcon, DownloadIcon } from "../../../../components/Icon";

export default function QuickStartPage() {

  const t = TextPreset.QuickStartPage;

  return (
    <div className="overflow-y-auto h-full custom-scrollbar p-6 md:p-8 pb-16">
      <div className="flex items-center gap-2 text-lg font-semibold mb-4">
        <svg className="w-5 h-5 stroke-current stroke-2 fill-none stroke-linecap-round stroke-linejoin-round" viewBox="0 0 24 24">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        {t.title}
      </div>

      <div className="w-full flex flex-col">
        <div className="flex flex-col md:flex-row border-b border-(--border-color) py-3 px-2">
          <div className={`w-full md:w-35 shrink-0 text-(--text-secondary) text-base mb-1 md:mb-0`}>
            1. Upload Image
          </div>
          <div className={`flex flex-wrap items-center gap-y-1.5 text-base`}>
            <span className="mr-1">{t.dragDrop}</span>
            <span className="inline-flex items-center whitespace-nowrap">
              <span className="mr-1"><FolderIcon size={18} /></span> {t.file}
            </span>
            <span className="inline-flex items-center mx-1"><ArrowRightIcon /></span>
            <span className="inline-flex items-center whitespace-nowrap">
              <span className="mr-1"><ImageIcon size={17} /></span> {t.importImg}
            </span>
            <span className="text-(--text-secondary) mx-1">|</span>
            <span className="inline-flex items-center whitespace-nowrap">
              <span className="mr-1"><ZipIcon size={19} /></span> {t.importTemplate}
            </span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row border-b border-(--border-color) py-3 px-2">
          <div className={`w-full md:w-35 shrink-0 text-(--text-secondary) text-base mb-1 md:mb-0`}>
            2. Set Properties
          </div>
          <div className="text-base">
            {t.propertiesList}
          </div>
        </div>

        <div className="flex flex-col md:flex-row border-b border-(--border-color) py-3 px-2">
          <div className={`w-full md:w-35 shrink-0 text-(--text-secondary) text-base mb-1 md:mb-0`}>
            3. Add Abilities
          </div>
          <div className="text-base">
            {t.writeAbilities}<Link className="font-semibold hover:underline" href="/docs?section=text-decoration">Syntax Reference</Link>
          </div>
        </div>

        <div className="flex flex-col md:flex-row border-b border-(--border-color) py-3 px-2">
          <div className={`w-full md:w-35 shrink-0 text-(--text-secondary) text-base mb-1 md:mb-0`}>
            4. Export
          </div>
          <div className={`flex flex-wrap items-center gap-y-1.5 text-base`}>
            <span className="mr-1">{t.headTo}</span>
            <span className="inline-flex items-center whitespace-nowrap">
              <span className="mr-1"><FolderIcon size={18} /></span> {t.file}
            </span>
            <span className="inline-flex items-center mx-1"><ArrowRightIcon /></span>
            <span className="inline-flex items-center whitespace-nowrap">
              <span className="mr-1"><ImageIcon size={17} /></span> {t.downloadImg}
            </span>
            <span className="inline-flex items-center mx-1"><ArrowRightIcon /></span>
            <span className="whitespace-nowrap">{t.selectQuality}</span>
            <span className="text-(--text-secondary) mx-1">|</span>
            <span className="inline-flex items-center whitespace-nowrap">
              <span className="mr-1"><ZipIcon size={19} /></span> {t.exportTemplate}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}