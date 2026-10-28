'use client';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const features = [
  { title: 'Real-time messaging', desc: 'Instant delivery over WebSockets with auto-reconnect.' },
  { title: 'Group chats', desc: 'Create groups, share conversations with many members.' },
  { title: 'Presence & typing', desc: 'Online/offline dots and live typing indicators.' },
  { title: 'Delivery states', desc: 'Sent, delivered, and read ticks like WhatsApp.' },
  { title: 'Media sharing', desc: 'Send images and files with previews.' },
  { title: 'Sync on reconnect', desc: 'Never lose messages; missed ones sync automatically.' },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/chat');
  }, [user, loading, router]);

  const toggleDark = () => {
    const el = document.documentElement;
    el.classList.toggle('dark');
    localStorage.setItem('theme', el.classList.contains('dark') ? 'dark' : 'light');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-950 text-gray-900 dark:text-gray-100">
      {/* Nav */}
      <nav className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-white font-bold">C</div>
          <span className="font-bold text-xl">ChatApp</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleDark} className="px-3 py-1.5 rounded-lg border dark:border-gray-700 text-sm">🌙</button>
          <Link href="/login" className="text-sm font-medium hover:text-green-600">Login</Link>
          <Link href="/signup" className="text-sm font-medium bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-12 pb-20 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight">
            Chat in real time,<br />
            <span className="text-green-600">like WhatsApp Web</span>
          </h1>
          <p className="mt-5 text-lg text-gray-600 dark:text-gray-300">
            A full-stack real-time chat app with 1:1 and group conversations, presence, typing indicators, delivery states, media sharing, and automatic sync on reconnect.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 shadow-lg shadow-green-600/30">Create free account</Link>
            <Link href="/login" className="px-6 py-3 rounded-xl font-semibold border dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">I already have an account</Link>
          </div>
          <div className="mt-6 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span>⚡ WebSockets</span>
            <span>🔒 JWT auth</span>
            <span>📱 Responsive</span>
          </div>
        </div>

        {/* Mock chat preview */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border dark:border-gray-700">
          <div className="bg-green-600 text-white px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-800 flex items-center justify-center font-bold">B</div>
            <div>
              <div className="font-semibold">Bob</div>
              <div className="text-xs opacity-80">online</div>
            </div>
          </div>
          <div className="p-4 space-y-3 bg-gray-50 dark:bg-gray-900 h-64">
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-700 px-3 py-2 rounded-lg shadow text-sm max-w-[70%]">
                Hey! How are you? <div className="text-[10px] text-gray-400 mt-1">10:30</div>
              </div>
            </div>
            <div className="flex justify-end">
              <div className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm max-w-[70%]">
                Doing great, thanks! 😊
                <div className="text-[10px] text-green-100 mt-1 flex justify-end gap-1">10:31 <span>✓✓</span></div>
              </div>
            </div>
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-700 px-3 py-2 rounded-lg shadow text-sm">
                <span className="italic text-gray-500">typing...</span>
              </div>
            </div>
          </div>
          <div className="px-4 py-3 border-t dark:border-gray-700 flex gap-2">
            <input disabled className="flex-1 border rounded-full px-4 py-2 dark:bg-gray-700 dark:border-gray-600 text-sm" placeholder="Type a message" />
            <button className="bg-green-600 text-white px-4 py-2 rounded-full text-sm">Send</button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-10">Everything you need to chat</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          {features.map(f => (
            <div key={f.title} className="p-6 rounded-2xl bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-sm hover:shadow-md transition">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/40 text-green-600 flex items-center justify-center mb-4 font-bold">✓</div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-10">How it works</h2>
        <div className="grid md:grid-cols-3 gap-6 text-center">
          {[
            { n: '1', t: 'Create an account', d: 'Sign up with email and password in seconds.' },
            { n: '2', t: 'Start a conversation', d: 'Pick a contact or create a group.' },
            { n: '3', t: 'Chat in real time', d: 'Messages sync instantly and on reconnect.' },
          ].map(s => (
            <div key={s.n} className="p-6">
              <div className="w-12 h-12 mx-auto rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-xl mb-4">{s.n}</div>
              <h3 className="font-semibold mb-2">{s.t}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <div className="bg-green-600 text-white rounded-3xl p-10 shadow-xl">
          <h2 className="text-3xl font-bold mb-3">Ready to start chatting?</h2>
          <p className="opacity-90 mb-6">Join ChatApp today — it's free.</p>
          <Link href="/signup" className="inline-block bg-white text-green-600 font-semibold px-8 py-3 rounded-xl hover:bg-gray-100">Get started now</Link>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400 border-t dark:border-gray-800">
        © 2026 ChatApp. Built with Next.js, Socket.IO, MySQL & Redis.
      </footer>
    </div>
  );
}
