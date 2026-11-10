import { CircleDashed } from 'lucide-react';
import type { Metadata } from 'next';
import { DetailPlaceholder, EmptyState, ListPane } from '@/features/casca/components/panes';
import { t } from '@/i18n';

export const metadata: Metadata = { title: t.updates.title };

export default function UpdatesPage() {
  return (
    <>
      <ListPane title={t.updates.title}>
        <EmptyState
          icon={CircleDashed}
          title={t.updates.emptyTitle}
          description={t.updates.emptyDescription}
        />
      </ListPane>
      <DetailPlaceholder description={t.app.tagline} />
    </>
  );
}
