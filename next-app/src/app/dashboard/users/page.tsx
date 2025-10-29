'use client';

// ============================================================================
// ユーザー管理画面（組織管理者用）
// /dashboard/users
// ============================================================================

import { useState } from 'react';

export default function UsersPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [initialPassword, setInitialPassword] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setInitialPassword(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('user_name') as string,
      email: formData.get('user_email') as string,
      role: formData.get('role') as string,
      send_email: formData.get('send_email') === 'on',
    };

    try {
      const response = await fetch('/api/users/register-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to register user');
      }

      const result = await response.json();

      // 初期パスワードが返された場合（メール送信しない場合）
      if (result.data.initial_password) {
        setInitialPassword(result.data.initial_password);
        setSuccess(`ユーザー「${data.name}」を登録しました`);
      } else {
        // メール送信した場合
        setSuccess(`ユーザー「${data.name}」を登録し、招待メールを送信しました`);
        // フォームをリセット
        (e.target as HTMLFormElement).reset();
        setShowForm(false);
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
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">ユーザー管理</h1>
            <button
              type="button"
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              {showForm ? 'フォームを閉じる' : '+ 新規ユーザー登録'}
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            自組織内の新しいメンバーを追加できます。
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              <p className="font-semibold">エラー</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
              <p className="font-semibold">✅ 成功</p>
              <p className="text-sm">{success}</p>
              {initialPassword && (
                <div className="mt-3">
                  <p className="text-sm mb-2">
                    以下の初期パスワードをユーザーに連絡してください：
                  </p>
                  <div className="bg-white border border-green-300 px-3 py-2 rounded font-mono text-sm flex items-center justify-between">
                    <span className="break-all">{initialPassword}</span>
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="ml-2 text-green-600 hover:text-green-800 text-xs underline flex-shrink-0"
                    >
                      コピー
                    </button>
                  </div>
                  <p className="text-xs text-green-700 mt-2">
                    ⚠️ この画面を閉じると初期パスワードは再表示できません
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 新規登録フォーム */}
          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-6 mb-8">
              <section className="border border-gray-200 rounded p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  新規ユーザー情報
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

                  <div>
                    <label
                      htmlFor="role"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      ロール <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="role"
                      name="role"
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      defaultValue="EMITTER"
                    >
                      <option value="EMITTER">排出担当者</option>
                      <option value="TRANSPORTER">運搬担当者</option>
                      <option value="DISPOSER">処分担当者</option>
                      <option value="ADMIN">管理者</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      管理者は他のユーザーを追加・編集できます
                    </p>
                  </div>

                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id="send_email"
                      name="send_email"
                      defaultChecked
                      className="mt-1 mr-2"
                    />
                    <label
                      htmlFor="send_email"
                      className="text-sm text-gray-700"
                    >
                      <span className="font-medium">招待メールを送信</span>
                      <span className="block text-xs text-gray-500 mt-1">
                        チェックを外すと、初期パスワードが表示されます。ユーザーに直接連絡する場合はチェックを外してください。
                      </span>
                    </label>
                  </div>
                </div>
              </section>

              {/* 送信ボタン */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
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
          )}

          {/* ユーザー一覧（将来実装） */}
          <section className="border border-gray-200 rounded p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              ユーザー一覧
            </h2>
            <p className="text-sm text-gray-500">
              ユーザー一覧表示機能は今後実装予定です
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
