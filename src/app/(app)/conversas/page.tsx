import { MessageCircle } from 'lucide-react';
import type { Metadata } from 'next';
import { DetailPlaceholder, EmptyState, ListPane } from '@/features/casca/components/panes';
import { t } from '@/i18n';

export const metadata: Metadata = { title: t.conversations.title };

export default function ConversationsPage() {
  return (
    <>
      <ListPane title={t.conversations.title}>
        <EmptyState
          icon={MessageCircle}
          title={t.conversations.emptyTitle}
          description={t.conversations.emptyDescription}
        />
      </ListPane>
      <DetailPlaceholder description={t.conversations.detailEmptyDescription} />
    </>
  );
}
