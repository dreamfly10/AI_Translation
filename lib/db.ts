import { supabaseServer, isSupabaseConfigured } from './supabase';

export interface User {
  id: string;
  email: string;
  password?: string; // hashed
  name?: string;
  image?: string;
  userType: 'trial' | 'paid';
  tokensUsed: number;
  tokenLimit: number;
  subscriptionStatus?: 'active' | 'expired' | 'cancelled';
  subscriptionExpiresAt?: Date | string;
  paymentId?: string;
  // User preferences
  defaultWritingStyle?: 'warmBookish' | 'lifeReflection' | 'contrarian' | 'education' | 'science' | null;
  defaultExpressionVariation?: 'light' | 'medium' | 'heavy';
  defaultTargetLanguage?: 'zh' | 'en' | 'es' | 'fr' | 'de' | 'ja' | 'ko' | 'pt' | 'it' | 'ru' | 'ar';
  showLanguageToggle?: boolean;
  defaultUILanguage?: 'en' | 'zh';
  createdAt: Date | string;
  updatedAt?: Date | string;
}

interface Session {
  userId: string;
  expires: Date;
}

// Database operations using Supabase
export const db = {
  user: {
    async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) {
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.');
      }

      const { data: user, error } = await supabaseServer
        .from('users')
        .insert({
          email: data.email,
          password: data.password,
          name: data.name,
          image: data.image,
          user_type: data.userType || 'trial',
          tokens_used: data.tokensUsed ?? 0,
          token_limit: data.tokenLimit ?? 1000, // 1k tokens for trial users
          subscription_status: data.subscriptionStatus,
          subscription_expires_at: data.subscriptionExpiresAt
            ? new Date(data.subscriptionExpiresAt).toISOString()
            : null,
          payment_id: data.paymentId,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating user:', error);
        // Provide more helpful error messages
        if (error.code === '42P01') {
          throw new Error('Database table "users" does not exist. Please run the SQL schema from supabase/schema.sql in your Supabase SQL Editor.');
        }
        if (error.message?.includes('JWT')) {
          throw new Error('Invalid Supabase API key. Please check your NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
        }
        throw error;
      }

      return this.mapUser(user);
    },

    async findByEmail(email: string): Promise<User | null> {
      if (!isSupabaseConfigured()) {
        return null; // Return null if not configured (for graceful degradation)
      }

      const { data, error } = await supabaseServer
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        console.error('Error finding user by email:', error);
        throw error;
      }

      return data ? this.mapUser(data) : null;
    },

    async findById(id: string): Promise<User | null> {
      const { data, error } = await supabaseServer
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        console.error('Error finding user by id:', error);
        throw error;
      }

      return data ? this.mapUser(data) : null;
    },

    async update(id: string, data: Partial<User>): Promise<User | null> {
      const updateData: any = {};

      if (data.email !== undefined) updateData.email = data.email;
      if (data.password !== undefined) updateData.password = data.password;
      if (data.name !== undefined) updateData.name = data.name;
      if (data.image !== undefined) updateData.image = data.image;
      if (data.userType !== undefined) updateData.user_type = data.userType;
      if (data.tokensUsed !== undefined) updateData.tokens_used = data.tokensUsed;
      if (data.tokenLimit !== undefined) updateData.token_limit = data.tokenLimit;
      if (data.subscriptionStatus !== undefined)
        updateData.subscription_status = data.subscriptionStatus;
      if (data.subscriptionExpiresAt !== undefined)
        updateData.subscription_expires_at = data.subscriptionExpiresAt
          ? new Date(data.subscriptionExpiresAt).toISOString()
          : null;
      if (data.paymentId !== undefined) updateData.payment_id = data.paymentId;
      if (data.defaultWritingStyle !== undefined) updateData.default_writing_style = data.defaultWritingStyle;
      if (data.defaultExpressionVariation !== undefined) updateData.default_expression_variation = data.defaultExpressionVariation;
      if (data.defaultTargetLanguage !== undefined) updateData.default_target_language = data.defaultTargetLanguage;
      if (data.showLanguageToggle !== undefined) updateData.show_language_toggle = data.showLanguageToggle;
      if (data.defaultUILanguage !== undefined) updateData.default_ui_language = data.defaultUILanguage;

      const { data: user, error } = await supabaseServer
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating user:', error);
        throw error;
      }

      return user ? this.mapUser(user) : null;
    },

    // Helper to map database row to User interface
    mapUser(row: any): User {
      return {
        id: row.id,
        email: row.email,
        password: row.password,
        name: row.name,
        image: row.image,
        userType: row.user_type,
        tokensUsed: row.tokens_used,
        tokenLimit: row.token_limit,
        subscriptionStatus: row.subscription_status,
        subscriptionExpiresAt: row.subscription_expires_at
          ? new Date(row.subscription_expires_at)
          : undefined,
        paymentId: row.payment_id,
        defaultWritingStyle: row.default_writing_style,
        defaultExpressionVariation: row.default_expression_variation,
        defaultTargetLanguage: row.default_target_language || 'zh',
        showLanguageToggle: row.show_language_toggle !== undefined ? row.show_language_toggle : true,
        defaultUILanguage: row.default_ui_language || 'en',
        createdAt: row.created_at ? new Date(row.created_at) : new Date(),
        updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
      };
    },
  },

  session: {
    async create(data: Session) {
      // Sessions are handled by NextAuth, but we can store them if needed
      // For now, this is a placeholder
      return data;
    },

    async findByUserId(userId: string): Promise<Session | null> {
      // Sessions are handled by NextAuth
      return null;
    },

    async delete(userId: string) {
      // Sessions are handled by NextAuth
      return;
    },
  },

  voiceProfile: {
    async create(data: {
      userId: string;
      name: string;
      slidersJson?: any;
      doList?: string[];
      dontList?: string[];
      styleRules?: any;
      customPrompt?: string;
      profileType?: 'samples' | 'prompt' | 'both';
    }) {
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase is not configured');
      }

      const { data: profile, error } = await supabaseServer
        .from('voice_profiles')
        .insert({
          user_id: data.userId,
          name: data.name,
          sliders_json: data.slidersJson || null,
          do_list: data.doList || [],
          dont_list: data.dontList || [],
          style_rules: data.styleRules || null,
          custom_prompt: data.customPrompt || null,
          profile_type: data.profileType || 'samples',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating voice profile:', error);
        // Provide more helpful error messages
        if (error.code === '42703' || error.message?.includes('column') && error.message?.includes('does not exist')) {
          throw new Error('Database columns "custom_prompt" or "profile_type" do not exist. Please run the migration from supabase/migrations/add_custom_prompt_to_voice_profiles.sql in your Supabase SQL Editor.');
        }
        if (error.code === '42P01') {
          throw new Error('Database table "voice_profiles" does not exist. Please run the SQL schema from supabase/schema.sql in your Supabase SQL Editor.');
        }
        throw error;
      }

      return this.mapVoiceProfile(profile);
    },

    async findByUserId(userId: string) {
      if (!isSupabaseConfigured()) {
        return [];
      }

      const { data, error } = await supabaseServer
        .from('voice_profiles')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching voice profiles:', error);
        throw error;
      }

      return (data || []).map((row: any) => this.mapVoiceProfile(row));
    },

    async findById(id: string) {
      if (!isSupabaseConfigured()) {
        return null;
      }

      const { data, error } = await supabaseServer
        .from('voice_profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Error fetching voice profile:', error);
        throw error;
      }

      return data ? this.mapVoiceProfile(data) : null;
    },

    async update(id: string, data: {
      name?: string;
      slidersJson?: any;
      doList?: string[];
      dontList?: string[];
      styleRules?: any;
      customPrompt?: string;
      profileType?: 'samples' | 'prompt' | 'both';
    }) {
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase is not configured');
      }

      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.slidersJson !== undefined) updateData.sliders_json = data.slidersJson;
      if (data.doList !== undefined) updateData.do_list = data.doList;
      if (data.dontList !== undefined) updateData.dont_list = data.dontList;
      if (data.styleRules !== undefined) updateData.style_rules = data.styleRules;
      if (data.customPrompt !== undefined) updateData.custom_prompt = data.customPrompt;
      if (data.profileType !== undefined) updateData.profile_type = data.profileType;

      const { data: profile, error } = await supabaseServer
        .from('voice_profiles')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating voice profile:', error);
        throw error;
      }

      return profile ? this.mapVoiceProfile(profile) : null;
    },

    async delete(id: string) {
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase is not configured');
      }

      const { error } = await supabaseServer
        .from('voice_profiles')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting voice profile:', error);
        throw error;
      }
    },

    mapVoiceProfile(row: any) {
      return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        slidersJson: row.sliders_json,
        doList: row.do_list || [],
        dontList: row.dont_list || [],
        styleRules: row.style_rules,
        customPrompt: row.custom_prompt || null,
        profileType: (row.profile_type || 'samples') as 'samples' | 'prompt' | 'both',
        createdAt: row.created_at ? new Date(row.created_at) : new Date(),
        updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
      };
    },
  },

  voiceSample: {
    async create(data: {
      voiceProfileId: string;
      content: string;
      wordCount?: number;
      platform?: string;
    }) {
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase is not configured');
      }

      const { data: sample, error } = await supabaseServer
        .from('voice_samples')
        .insert({
          voice_profile_id: data.voiceProfileId,
          content: data.content,
          word_count: data.wordCount || data.content.split(/\s+/).length,
          platform: data.platform || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating voice sample:', error);
        throw error;
      }

      return this.mapVoiceSample(sample);
    },

    async findById(id: string) {
      if (!isSupabaseConfigured()) {
        return null;
      }

      const { data, error } = await supabaseServer
        .from('voice_samples')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Error fetching voice sample:', error);
        throw error;
      }

      return data ? this.mapVoiceSample(data) : null;
    },

    async findByProfileId(voiceProfileId: string) {
      if (!isSupabaseConfigured()) {
        return [];
      }

      const { data, error } = await supabaseServer
        .from('voice_samples')
        .select('*')
        .eq('voice_profile_id', voiceProfileId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching voice samples:', error);
        throw error;
      }

      return (data || []).map((row: any) => this.mapVoiceSample(row));
    },

    async delete(id: string) {
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase is not configured');
      }

      const { error } = await supabaseServer
        .from('voice_samples')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting voice sample:', error);
        throw error;
      }
    },

    mapVoiceSample(row: any) {
      return {
        id: row.id,
        voiceProfileId: row.voice_profile_id,
        content: row.content,
        wordCount: row.word_count,
        platform: row.platform,
        createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      };
    },
  },
};
