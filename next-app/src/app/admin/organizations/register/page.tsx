'use client';

// ============================================================================
// 排出企業代理登録画面（システム管理会社用）
// /admin/organizations/register
// ============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OrganizationRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialPassword, setInitialPassword] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInitialPassword(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      organization: {
        name: formData.get('org_name') as string,
        code: formData.get('org_code') as string,
      },
      master_user: {
        name: formData.get('user_name') as string,
        email: formData.get('user_email') as string,
        send_email: formData.get('send_email') === 'on',
      },
    };

    try {
      const response = await fetch('/api/admin/organizations/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to register organization');
      }

      const result = await response.json();

      // 初期パスワードが返された場合（メール送信しない場合）
      if (result.data.master_user.initial_password) {
        setInitialPassword(result.data.master_user.initial_password);
      } else {
        // メール送信した場合は組織一覧へリダイレクト
        alert('排出企業を登録しました。招待メールを送信しました。');
        router.push('/admin/organizations');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPassword = () => {
    if (initialPassword) {
      navigator.clipboard.writeText(initialPassword);
      alert('初期パスワードをコピーしました');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            排出企業代理登録
          </h1>

          <p className="text-sm text-gray-600 mb-6">
            システム管理会社として、排出企業とマスターユーザーを一括登録します。
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              <p className="font-semibold">エラー</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {initialPassword && (
            <div className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-3 rounded mb-6">
              <p className="font-semibold mb-2">✅ 登録完了</p>
              <p className="text-sm mb-2">
                以下の初期パスワードを排出企業に連絡してください：
              </p>
              <div className="bg-white border border-blue-300 px-3 py-2 rounded font-mono text-sm mb-2 flex items-center justify-between">
                <span className="break-all">{initialPassword}</span>
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className="ml-2 text-blue-600 hover:text-blue-800 text-xs underline flex-shrink-0"
                >
                  コピー
                </button>
              </div>
              <p className="text-xs text-blue-700">
                ⚠️ この画面を閉じると初期パスワードは再表示できません
              </p>
              <button
                type="button"
                onClick={() => router.push('/admin/organizations')}
                className="mt-3 text-blue-600 hover:text-blue-800 text-sm underline"
              >
                組織一覧へ戻る
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 組織情報 */}
            <section className="border border-gray-200 rounded p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                組織情報
              </h2>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="org_name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    会社名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="org_name"
                    name="org_name"
                    required
                    maxLength={255}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="株式会社○○"
                  />
                </div>

                <div>
                  <label
                    htmlFor="org_code"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    組織コード <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="org_code"
                    name="org_code"
                    required
                    maxLength={50}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ORG001"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    半角英数字、ハイフン、アンダースコアが使用可能です
                  </p>
                </div>
              </div>
            </section>

            {/* マスターユーザー情報 */}
            <section className="border border-gray-200 rounded p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                マスターユーザー情報
              </h2>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="user_name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    氏名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="user_name"
                    name="user_name"
                    required
                    maxLength={255}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="山田 太郎"
                  />
                </div>

                <div>
                  <label
                    htmlFor="user_email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    メールアドレス <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="user_email"
                    name="user_email"
                    required
                    maxLength={255}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="user@example.com"
                  />
                </div>

                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="send_email"
                    name="send_email"
                    defaultChecked
                    className="mt-1 mr-2"
                  />
                  <label htmlFor="send_email" className="text-sm text-gray-700">
                    <span className="font-medium">招待メールを送信</span>
                    <span className="block text-xs text-gray-500 mt-1">
                      チェックを外すと、初期パスワードが表示されます。排出企業に直接連絡する場合はチェックを外してください。
                    </span>
                  </label>
                </div>
              </div>
            </section>

            {/* 送信ボタン */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-50 disabled:opacity-50"
                disabled={loading}
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '登録中...' : '登録する'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}



