import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/lib/auth-context';
import { authStore} from '@/lib/auth-store';
import { uploadFileSimple } from '@repo/storage-client';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: Date;
  avatar?: { url: string } | null;
  coverImage?: { url: string } | null;
}

export default function Profile() {
  const router = useRouter();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [error, setError] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const handleLogout = async () => {
    await authStore.logout();
    router.replace('/login');
  };

  const loadProfile = async () => {
    if (!session) return await handleLogout();

    try {
      const [profile, subscription] = await Promise.all([
        trpc.user.me.query(),
        trpc.stripe.getSubscription.query(),
      ]);
      setUser(profile);
      setIsPremium(subscription.isPremium);
    } catch {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (type: 'avatar' | 'cover') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'avatar' ? [1, 1] : [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0], type);
    }
  };

  const uploadImage = async (asset: ImagePicker.ImagePickerAsset, type: 'avatar' | 'cover') => {
    if (type === 'avatar') setUploadingAvatar(true);
    else setUploadingCover(true);
    setError('');

    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const file = new File([blob], asset.fileName || 'image.jpg', { type: asset.mimeType || 'image/jpeg' });

      const { uploadUrl, publicUrl, fileKey } = await trpc.media.getUploadUrl.mutate({
        fileName: file.name,
        fileType: file.type,
      });

      await uploadFileSimple(file, uploadUrl);

      if (type === 'avatar') {
        await trpc.media.updateAvatar.mutate({ url: publicUrl, key: fileKey, size: file.size });
      } else {
        await trpc.media.updateCover.mutate({ url: publicUrl, key: fileKey, size: file.size });
      }

      await loadProfile();
    } catch {
      setError('Failed to upload image');
    } finally {
      setUploadingAvatar(false);
      setUploadingCover(false);
    }
  };

  const removeMedia = async (type: 'avatar' | 'cover') => {
    Alert.alert(
      'Remove Media',
      `Are you sure you want to remove your ${type}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              if (type === 'avatar') {
                setUploadingAvatar(true);
                await trpc.media.removeAvatar.mutate();
              } else {
                setUploadingCover(true);
                await trpc.media.removeCover.mutate();
              }
              await loadProfile();
            } catch {
              setError('Failed to remove media');
            } finally {
              setUploadingAvatar(false);
              setUploadingCover(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (error && !user) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {user && (
        <>
          <View style={styles.coverContainer}>
            {uploadingCover ? (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
            ) : user.coverImage?.url ? (
              <Image source={{ uri: user.coverImage.url }} style={styles.coverImage} />
            ) : (
              <View style={styles.coverPlaceholder} />
            )}
            <View style={styles.coverButtons}>
              <TouchableOpacity
                style={styles.coverButton}
                onPress={() => pickImage('cover')}
                disabled={uploadingCover}
              >
                <Text style={styles.coverButtonText}>Change Cover</Text>
              </TouchableOpacity>
              {user.coverImage && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeMedia('cover')}
                  disabled={uploadingCover}
                >
                  <Text style={styles.removeButtonText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.content}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarWrapper}>
                {uploadingAvatar ? (
                  <View style={styles.avatar}>
                    <ActivityIndicator size="large" color="#000" />
                  </View>
                ) : user.avatar?.url ? (
                  <Image source={{ uri: user.avatar.url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarPlaceholderText}>
                      {user.firstName?.[0]?.toUpperCase() || '?'}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.avatarButton}
                  onPress={() => pickImage('avatar')}
                  disabled={uploadingAvatar}
                >
                  <Text style={styles.avatarButtonText}>📷</Text>
                </TouchableOpacity>
                {user.avatar && (
                  <TouchableOpacity
                    style={styles.avatarRemoveButton}
                    onPress={() => removeMedia('avatar')}
                    disabled={uploadingAvatar}
                  >
                    <Text style={styles.removeButtonText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.userInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>
                    {user.firstName} {user.lastName}
                  </Text>
                  {isPremium && (
                    <View style={styles.premiumBadge}>
                      <Text style={styles.premiumText}>👑 PREMIUM</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.email}>{user.email}</Text>
              </View>
            </View>

            {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>ROLE</Text>
                <Text style={styles.statValue}>{user.role}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>MEMBER SINCE</Text>
                <Text style={styles.statValue}>
                  {new Date(user.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>EXPERIENCE</Text>
                <Text style={styles.statValue}>{isPremium ? '👑 Elite' : '⭐ Explorer'}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.homeButton} onPress={() => router.push('/')}>
              <Text style={styles.homeButtonText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  coverContainer: {
    height: 200,
    backgroundColor: '#e5e7eb',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#d1d5db',
  },
  uploadingOverlay: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverButtons: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
  },
  coverButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  coverButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111',
  },
  removeButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  removeButtonText: {
    fontSize: 18,
    color: '#dc2626',
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  avatarContainer: {
    marginTop: -60,
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    backgroundColor: '#d1d5db',
  },
  avatarPlaceholderText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  avatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4f46e5',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarButtonText: {
    fontSize: 20,
  },
  avatarRemoveButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#fff',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  userInfo: {
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111',
  },
  premiumBadge: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  email: {
    fontSize: 16,
    color: '#6b7280',
  },
  statsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#9ca3af',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111',
    textTransform: 'capitalize',
  },
  logoutButton: {
    backgroundColor: '#dc2626',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  homeButton: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  homeButtonText: {
    color: '#111',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  error: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
    textAlign: 'center',
  },
});
