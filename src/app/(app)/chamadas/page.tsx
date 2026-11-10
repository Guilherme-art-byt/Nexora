import { Phone } from 'lucide-react';
import type { Metadata } from 'next';
import { DetailPlaceholder, EmptyState, ListPane } from '@/features/casca/components/panes';
import { t } from '@/i18n';

export const metadata: Metadata = { title: t.calls.title };

export default function CallsPage() {
  return (
    <>
      <ListPane title={t.calls.title}>
        <EmptyState
          icon={Phone}
          title={t.calls.emptyTitle}
          description={t.calls.emptyDescription}
        />
      </ListPane>
      <DetailPlaceholder description={t.app.tagline} />
    </>
  );
}
