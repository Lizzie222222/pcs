import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";

interface EvidenceVideoLinksProps {
  videoLinks: string | null;
}

export function EvidenceVideoLinks({ videoLinks }: EvidenceVideoLinksProps) {
  const { t } = useTranslation();
  if (!videoLinks || videoLinks.trim() === '') {
    return null;
  }

  // Split by newlines and filter empty strings
  const links = videoLinks.split('\n').filter(link => link.trim() !== '');

  if (links.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2">
      <p className="text-sm font-semibold text-gray-700">{t('messages.video_links')}</p>
      <ul className="space-y-1">
        {links.map((link, index) => (
          <li key={index} className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-pcs_blue flex-shrink-0" />
            <a
              href={link.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-pcs_blue hover:underline break-all"
              data-testid={`link-video-${index}`}
            >
              {link.trim()}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
