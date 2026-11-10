export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      app_config: {
        Row: {
          key: string;
          updated_at: string;
          value: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          key: string;
          updated_at?: string;
          value: NonNullable<Json>;
        };
        Update: {
          key?: string;
          updated_at?: string;
          value?: NonNullable<Json>;
        };
        Relationships: [];
      };
      blocks: {
        Row: {
          blocked_id: string;
          blocker_id: string;
          created_at: string;
        };
        ComputedFields: never;
        Insert: {
          blocked_id: string;
          blocker_id: string;
          created_at?: string;
        };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'blocks_blocked_id_fkey';
            columns: ['blocked_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'blocks_blocker_id_fkey';
            columns: ['blocker_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      call_participants: {
        Row: {
          call_id: string;
          joined_at: string | null;
          left_at: string | null;
          state: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          call_id: string;
          joined_at?: string | null;
          left_at?: string | null;
          state?: string;
          user_id: string;
        };
        Update: {
          call_id?: string;
          joined_at?: string | null;
          left_at?: string | null;
          state?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'call_participants_call_id_fkey';
            columns: ['call_id'];
            isOneToOne: false;
            referencedRelation: 'calls';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'call_participants_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      calls: {
        Row: {
          answered_at: string | null;
          caller_id: string | null;
          conversation_id: string;
          created_at: string;
          end_reason: string | null;
          ended_at: string | null;
          id: string;
          kind: string;
        };
        ComputedFields: never;
        Insert: {
          answered_at?: string | null;
          caller_id?: string | null;
          conversation_id: string;
          created_at?: string;
          end_reason?: string | null;
          ended_at?: string | null;
          id?: string;
          kind: string;
        };
        Update: {
          answered_at?: string | null;
          caller_id?: string | null;
          conversation_id?: string;
          created_at?: string;
          end_reason?: string | null;
          ended_at?: string | null;
          id?: string;
          kind?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'calls_caller_id_fkey';
            columns: ['caller_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'calls_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
        ];
      };
      contacts: {
        Row: {
          contact_id: string;
          created_at: string;
          nickname: string | null;
          owner_id: string;
        };
        ComputedFields: never;
        Insert: {
          contact_id: string;
          created_at?: string;
          nickname?: string | null;
          owner_id: string;
        };
        Update: {
          contact_id?: string;
          created_at?: string;
          nickname?: string | null;
          owner_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'contacts_contact_id_fkey';
            columns: ['contact_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contacts_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      conversation_members: {
        Row: {
          added_by: string | null;
          conversation_id: string;
          joined_at: string;
          left_at: string | null;
          role: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          added_by?: string | null;
          conversation_id: string;
          joined_at?: string;
          left_at?: string | null;
          role?: string;
          user_id: string;
        };
        Update: {
          added_by?: string | null;
          conversation_id?: string;
          joined_at?: string;
          left_at?: string | null;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'conversation_members_added_by_fkey';
            columns: ['added_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversation_members_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversation_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      conversation_states: {
        Row: {
          archived: boolean;
          cleared_at: string | null;
          conversation_id: string;
          favorite: boolean;
          hidden: boolean;
          last_read_at: string | null;
          marked_unread: boolean;
          muted_until: string | null;
          pinned_at: string | null;
          unread_count: number;
          unread_mentions: number;
          updated_at: string;
          user_id: string;
          wallpaper: string | null;
        };
        ComputedFields: never;
        Insert: {
          archived?: boolean;
          cleared_at?: string | null;
          conversation_id: string;
          favorite?: boolean;
          hidden?: boolean;
          last_read_at?: string | null;
          marked_unread?: boolean;
          muted_until?: string | null;
          pinned_at?: string | null;
          unread_count?: number;
          unread_mentions?: number;
          updated_at?: string;
          user_id: string;
          wallpaper?: string | null;
        };
        Update: {
          archived?: boolean;
          cleared_at?: string | null;
          conversation_id?: string;
          favorite?: boolean;
          hidden?: boolean;
          last_read_at?: string | null;
          marked_unread?: boolean;
          muted_until?: string | null;
          pinned_at?: string | null;
          unread_count?: number;
          unread_mentions?: number;
          updated_at?: string;
          user_id?: string;
          wallpaper?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'conversation_states_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversation_states_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      conversations: {
        Row: {
          avatar_path: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          direct_key: string | null;
          disappearing_seconds: number | null;
          edit_policy: string;
          id: string;
          join_approval: boolean;
          last_message_at: string | null;
          last_message_id: string | null;
          name: string | null;
          send_policy: string;
          type: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          avatar_path?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          direct_key?: string | null;
          disappearing_seconds?: number | null;
          edit_policy?: string;
          id?: string;
          join_approval?: boolean;
          last_message_at?: string | null;
          last_message_id?: string | null;
          name?: string | null;
          send_policy?: string;
          type: string;
          updated_at?: string;
        };
        Update: {
          avatar_path?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          direct_key?: string | null;
          disappearing_seconds?: number | null;
          edit_policy?: string;
          id?: string;
          join_approval?: boolean;
          last_message_at?: string | null;
          last_message_id?: string | null;
          name?: string | null;
          send_policy?: string;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'conversations_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversations_last_message_fk';
            columns: ['last_message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
        ];
      };
      group_invites: {
        Row: {
          code: string;
          conversation_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          revoked_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          code?: string;
          conversation_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          revoked_at?: string | null;
        };
        Update: {
          code?: string;
          conversation_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          revoked_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'group_invites_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'group_invites_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      group_join_requests: {
        Row: {
          conversation_id: string;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          status: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          conversation_id: string;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          status?: string;
          user_id: string;
        };
        Update: {
          conversation_id?: string;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'group_join_requests_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'group_join_requests_decided_by_fkey';
            columns: ['decided_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'group_join_requests_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      link_previews: {
        Row: {
          description: string | null;
          fetched_at: string;
          image_url: string | null;
          site_name: string | null;
          title: string | null;
          url: string;
          url_hash: string;
        };
        ComputedFields: never;
        Insert: {
          description?: string | null;
          fetched_at?: string;
          image_url?: string | null;
          site_name?: string | null;
          title?: string | null;
          url: string;
          url_hash: string;
        };
        Update: {
          description?: string | null;
          fetched_at?: string;
          image_url?: string | null;
          site_name?: string | null;
          title?: string | null;
          url?: string;
          url_hash?: string;
        };
        Relationships: [];
      };
      message_attachments: {
        Row: {
          blur_preview: string | null;
          created_at: string;
          duration_ms: number | null;
          file_name: string | null;
          height: number | null;
          id: string;
          message_id: string;
          mime_type: string;
          path: string;
          position: number;
          size_bytes: number;
          waveform: Json | null;
          width: number | null;
        };
        ComputedFields: never;
        Insert: {
          blur_preview?: string | null;
          created_at?: string;
          duration_ms?: number | null;
          file_name?: string | null;
          height?: number | null;
          id?: string;
          message_id: string;
          mime_type: string;
          path: string;
          position?: number;
          size_bytes: number;
          waveform?: Json | null;
          width?: number | null;
        };
        Update: {
          blur_preview?: string | null;
          created_at?: string;
          duration_ms?: number | null;
          file_name?: string | null;
          height?: number | null;
          id?: string;
          message_id?: string;
          mime_type?: string;
          path?: string;
          position?: number;
          size_bytes?: number;
          waveform?: Json | null;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'message_attachments_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
        ];
      };
      message_deletions: {
        Row: {
          created_at: string;
          message_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          message_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          message_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'message_deletions_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'message_deletions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      message_mentions: {
        Row: {
          message_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          message_id: string;
          user_id: string;
        };
        Update: {
          message_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'message_mentions_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'message_mentions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      message_reactions: {
        Row: {
          created_at: string;
          emoji: string;
          message_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          emoji: string;
          message_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          emoji?: string;
          message_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'message_reactions_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'message_reactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      message_receipts: {
        Row: {
          delivered_at: string | null;
          message_id: string;
          played_at: string | null;
          read_at: string | null;
          user_id: string;
          viewed_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          delivered_at?: string | null;
          message_id: string;
          played_at?: string | null;
          read_at?: string | null;
          user_id: string;
          viewed_at?: string | null;
        };
        Update: {
          delivered_at?: string | null;
          message_id?: string;
          played_at?: string | null;
          read_at?: string | null;
          user_id?: string;
          viewed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'message_receipts_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'message_receipts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          content: string | null;
          conversation_id: string;
          created_at: string;
          deleted_at: string | null;
          delivered_all_at: string | null;
          edited_at: string | null;
          expires_at: string | null;
          forwarded: boolean;
          hidden_from_recipient: boolean;
          id: string;
          metadata: NonNullable<Json>;
          read_all_at: string | null;
          reply_to_id: string | null;
          search: unknown;
          sender_id: string | null;
          type: string;
          updated_at: string;
          view_once: boolean;
        };
        ComputedFields: never;
        Insert: {
          content?: string | null;
          conversation_id: string;
          created_at?: string;
          deleted_at?: string | null;
          delivered_all_at?: string | null;
          edited_at?: string | null;
          expires_at?: string | null;
          forwarded?: boolean;
          hidden_from_recipient?: boolean;
          id: string;
          metadata?: NonNullable<Json>;
          read_all_at?: string | null;
          reply_to_id?: string | null;
          search?: never;
          sender_id?: string | null;
          type: string;
          updated_at?: string;
          view_once?: boolean;
        };
        Update: {
          content?: string | null;
          conversation_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          delivered_all_at?: string | null;
          edited_at?: string | null;
          expires_at?: string | null;
          forwarded?: boolean;
          hidden_from_recipient?: boolean;
          id?: string;
          metadata?: NonNullable<Json>;
          read_all_at?: string | null;
          reply_to_id?: string | null;
          search?: never;
          sender_id?: string | null;
          type?: string;
          updated_at?: string;
          view_once?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_reply_to_id_fkey';
            columns: ['reply_to_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      pinned_messages: {
        Row: {
          conversation_id: string;
          created_at: string;
          expires_at: string | null;
          message_id: string;
          pinned_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          conversation_id: string;
          created_at?: string;
          expires_at?: string | null;
          message_id: string;
          pinned_by?: string | null;
        };
        Update: {
          conversation_id?: string;
          created_at?: string;
          expires_at?: string | null;
          message_id?: string;
          pinned_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pinned_messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pinned_messages_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pinned_messages_pinned_by_fkey';
            columns: ['pinned_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      poll_options: {
        Row: {
          id: string;
          message_id: string;
          position: number;
          text: string;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          message_id: string;
          position: number;
          text: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          position?: number;
          text?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'poll_options_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'polls';
            referencedColumns: ['message_id'];
          },
        ];
      };
      poll_votes: {
        Row: {
          created_at: string;
          message_id: string;
          option_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          message_id: string;
          option_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          message_id?: string;
          option_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'poll_votes_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'polls';
            referencedColumns: ['message_id'];
          },
          {
            foreignKeyName: 'poll_votes_option_id_fkey';
            columns: ['option_id'];
            isOneToOne: false;
            referencedRelation: 'poll_options';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'poll_votes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      polls: {
        Row: {
          allow_multiple: boolean;
          message_id: string;
          question: string;
        };
        ComputedFields: never;
        Insert: {
          allow_multiple?: boolean;
          message_id: string;
          question: string;
        };
        Update: {
          allow_multiple?: boolean;
          message_id?: string;
          question?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'polls_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: true;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          about: string;
          avatar_path: string | null;
          created_at: string;
          display_name: string;
          id: string;
          invite_code: string;
          updated_at: string;
          username: string;
        };
        ComputedFields: never;
        Insert: {
          about?: string;
          avatar_path?: string | null;
          created_at?: string;
          display_name: string;
          id: string;
          invite_code?: string;
          updated_at?: string;
          username: string;
        };
        Update: {
          about?: string;
          avatar_path?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
          invite_code?: string;
          updated_at?: string;
          username?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          endpoint: string;
          id: string;
          last_used_at: string;
          p256dh: string;
          user_agent: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          auth: string;
          created_at?: string;
          endpoint: string;
          id?: string;
          last_used_at?: string;
          p256dh: string;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          auth?: string;
          created_at?: string;
          endpoint?: string;
          id?: string;
          last_used_at?: string;
          p256dh?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_subscriptions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      rate_limits: {
        Row: {
          action: string;
          count: number;
          user_id: string;
          window_start: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          count?: number;
          user_id: string;
          window_start: string;
        };
        Update: {
          action?: string;
          count?: number;
          user_id?: string;
          window_start?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          conversation_id: string | null;
          created_at: string;
          details: string | null;
          id: string;
          message_id: string | null;
          reason: string;
          reported_user_id: string | null;
          reporter_id: string;
        };
        ComputedFields: never;
        Insert: {
          conversation_id?: string | null;
          created_at?: string;
          details?: string | null;
          id?: string;
          message_id?: string | null;
          reason: string;
          reported_user_id?: string | null;
          reporter_id: string;
        };
        Update: {
          conversation_id?: string | null;
          created_at?: string;
          details?: string | null;
          id?: string;
          message_id?: string | null;
          reason?: string;
          reported_user_id?: string | null;
          reporter_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reports_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_reported_user_id_fkey';
            columns: ['reported_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_reporter_id_fkey';
            columns: ['reporter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      starred_messages: {
        Row: {
          created_at: string;
          message_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          message_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          message_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'starred_messages_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'starred_messages_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      status_privacy_lists: {
        Row: {
          kind: string;
          owner_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          kind: string;
          owner_id: string;
          user_id: string;
        };
        Update: {
          kind?: string;
          owner_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'status_privacy_lists_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'status_privacy_lists_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      status_recipients: {
        Row: {
          status_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          status_id: string;
          user_id: string;
        };
        Update: {
          status_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'status_recipients_status_id_fkey';
            columns: ['status_id'];
            isOneToOne: false;
            referencedRelation: 'statuses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'status_recipients_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      status_views: {
        Row: {
          status_id: string;
          viewed_at: string;
          viewer_id: string;
        };
        ComputedFields: never;
        Insert: {
          status_id: string;
          viewed_at?: string;
          viewer_id: string;
        };
        Update: {
          status_id?: string;
          viewed_at?: string;
          viewer_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'status_views_status_id_fkey';
            columns: ['status_id'];
            isOneToOne: false;
            referencedRelation: 'statuses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'status_views_viewer_id_fkey';
            columns: ['viewer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      statuses: {
        Row: {
          background: string | null;
          blur_preview: string | null;
          content: string | null;
          created_at: string;
          duration_ms: number | null;
          expires_at: string;
          id: string;
          media_path: string | null;
          type: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          background?: string | null;
          blur_preview?: string | null;
          content?: string | null;
          created_at?: string;
          duration_ms?: number | null;
          expires_at?: string;
          id?: string;
          media_path?: string | null;
          type: string;
          user_id: string;
        };
        Update: {
          background?: string | null;
          blur_preview?: string | null;
          content?: string | null;
          created_at?: string;
          duration_ms?: number | null;
          expires_at?: string;
          id?: string;
          media_path?: string | null;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'statuses_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      user_presence: {
        Row: {
          last_seen_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          last_seen_at?: string;
          user_id: string;
        };
        Update: {
          last_seen_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_presence_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      user_settings: {
        Row: {
          auto_download_audio: boolean;
          auto_download_documents: boolean;
          auto_download_images: boolean;
          auto_download_video: boolean;
          default_disappearing_seconds: number | null;
          enter_sends: boolean;
          font_size: string;
          notification_preview: boolean;
          notification_sound: boolean;
          notifications_enabled: boolean;
          privacy_about: string;
          privacy_avatar: string;
          privacy_groups: string;
          privacy_last_seen: string;
          privacy_status: string;
          read_receipts: boolean;
          theme: string;
          updated_at: string;
          user_id: string;
          wallpaper: string | null;
        };
        ComputedFields: never;
        Insert: {
          auto_download_audio?: boolean;
          auto_download_documents?: boolean;
          auto_download_images?: boolean;
          auto_download_video?: boolean;
          default_disappearing_seconds?: number | null;
          enter_sends?: boolean;
          font_size?: string;
          notification_preview?: boolean;
          notification_sound?: boolean;
          notifications_enabled?: boolean;
          privacy_about?: string;
          privacy_avatar?: string;
          privacy_groups?: string;
          privacy_last_seen?: string;
          privacy_status?: string;
          read_receipts?: boolean;
          theme?: string;
          updated_at?: string;
          user_id: string;
          wallpaper?: string | null;
        };
        Update: {
          auto_download_audio?: boolean;
          auto_download_documents?: boolean;
          auto_download_images?: boolean;
          auto_download_video?: boolean;
          default_disappearing_seconds?: number | null;
          enter_sends?: boolean;
          font_size?: string;
          notification_preview?: boolean;
          notification_sound?: boolean;
          notifications_enabled?: boolean;
          privacy_about?: string;
          privacy_avatar?: string;
          privacy_groups?: string;
          privacy_last_seen?: string;
          privacy_status?: string;
          read_receipts?: boolean;
          theme?: string;
          updated_at?: string;
          user_id?: string;
          wallpaper?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'user_settings_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      check_rate_limit: {
        Args: { p_action: string; p_limit: number; p_user_id: string; p_window_seconds: number };
        Returns: boolean;
      };
      get_profiles: {
        Args: { p_ids: string[] };
        Returns: {
          about: string;
          avatar_path: string;
          display_name: string;
          id: string;
          is_blocked_by_me: boolean;
          username: string;
        }[];
      };
      is_username_available: { Args: { p_username: string }; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
