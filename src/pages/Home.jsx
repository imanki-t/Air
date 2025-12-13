// src/pages/Home.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Core';
import {
  Cloud,
  Shield,
  Terminal,
  Globe,
  Server,
  Database,
  Code,
  Wifi
} from '../components/ui/Icons';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from '../components/ui/Icons';

const Home = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary selection:text-primary-foreground">
      {/* Navbar */}
      <header className="px-6 py-4 border-b border-border/40 sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg group-hover:scale-105 transition-transform duration-200">
               <Cloud size={24} />
            </div>
            <span className="text-xl font-bold tracking-tight">Airstream</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {['Features', 'Enterprise', 'Pricing', 'Docs', 'Changelog'].map((item) => (
              <a key={item} href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
             <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            >
              {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <Link to="/auth/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/auth/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {/* Hero Section */}
        <section className="relative pt-32 pb-24 lg:pt-48 lg:pb-32 overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_60%,var(--tw-gradient-stops))] from-primary/20 via-background to-background" />

          <div className="max-w-7xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="max-w-4xl mx-auto space-y-8"
            >
              <div className="inline-flex items-center rounded-full border border-border bg-background/50 backdrop-blur px-3 py-1 text-sm text-muted-foreground shadow-sm hover:bg-accent transition-colors cursor-pointer">
                <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
                <span className="font-medium text-foreground">v2.0 is now live</span>
                <span className="mx-2 text-muted-foreground/40">|</span>
                <span>Check out what's new &rarr;</span>
              </div>

              <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-foreground leading-[1.1]">
                Deploy to the <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">future cloud.</span>
              </h1>

              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                The developer platform designed for speed and scale. Build, deploy, and manage your applications with zero friction.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
                <Link to="/auth/signup" className="w-full sm:w-auto">
                  <Button size="xl" className="w-full sm:w-auto text-lg px-8">
                    Start Building
                  </Button>
                </Link>
                <Link to="/auth/login" className="w-full sm:w-auto">
                  <Button variant="outline" size="xl" className="w-full sm:w-auto text-lg px-8">
                    Read the Docs
                  </Button>
                </Link>
              </div>

              {/* Code Snippet */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="mt-16 rounded-xl border border-border bg-card/50 backdrop-blur shadow-2xl overflow-hidden max-w-3xl mx-auto text-left"
              >
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
                   <div className="flex gap-1.5">
                     <div className="w-3 h-3 rounded-full bg-red-500/80" />
                     <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                     <div className="w-3 h-3 rounded-full bg-green-500/80" />
                   </div>
                   <div className="flex-1 text-center text-xs font-mono text-muted-foreground opacity-70">bash</div>
                </div>
                <div className="p-6 font-mono text-sm overflow-x-auto">
                   <div className="flex gap-2 text-muted-foreground">
                      <span className="text-green-500">$</span>
                      <span>npm install @airstream/cli -g</span>
                   </div>
                   <div className="flex gap-2 text-muted-foreground mt-2">
                      <span className="text-green-500">$</span>
                      <span>airstream init my-app</span>
                   </div>
                   <div className="flex gap-2 text-foreground mt-2">
                      <span className="text-green-500">$</span>
                      <span>airstream deploy --prod</span>
                   </div>
                   <div className="mt-4 text-emerald-400">
                      > Deployed successfully to https://my-app.airstream.app 🚀
                   </div>
                   <div className="text-muted-foreground opacity-60">
                      > Build time: 420ms
                   </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Clients/Logos Section */}
        <section className="py-12 border-y border-border bg-muted/20">
           <div className="max-w-7xl mx-auto px-6 text-center">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-8">Trusted by innovative teams worldwide</p>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 items-center opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                  {/* Placeholders for logos - mimicking the effect */}
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-8 bg-foreground/20 rounded animate-pulse" />
                  ))}
              </div>
           </div>
        </section>

        {/* Features Grid */}
        <section className="px-6 py-32 bg-background">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-20">
               <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">Everything you need to ship.</h2>
               <p className="text-xl text-muted-foreground">
                 We've handled the infrastructure complexity so you can focus on building the next big thing.
               </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: <Server size={32} />,
                  title: 'Global Edge Network',
                  desc: 'Deploy your content to 35+ regions automatically. Low latency for everyone, everywhere.'
                },
                {
                  icon: <Shield size={32} />,
                  title: 'DDoS Protection',
                  desc: 'Enterprise-grade security included by default. We stop attacks before they reach your app.'
                },
                {
                  icon: <Database size={32} />,
                  title: 'Serverless Storage',
                  desc: 'Infinite scalability for your assets. Pay only for what you store and transfer.'
                },
                 {
                  icon: <Code size={32} />,
                  title: 'Instant Rollbacks',
                  desc: 'Made a mistake? Revert to a previous deployment version in milliseconds.'
                },
                 {
                  icon: <Terminal size={32} />,
                  title: 'CLI First',
                  desc: 'A powerful command line interface that fits perfectly into your existing workflow.'
                },
                 {
                  icon: <Globe size={32} />,
                  title: 'Custom Domains',
                  desc: 'Connect your own domain with zero-downtime SSL certification handling.'
                },
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -5 }}
                  className="p-8 rounded-2xl border border-border bg-card hover:shadow-lg transition-all"
                >
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 px-6">
           <div className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-br from-primary to-purple-600 p-12 md:p-24 text-center text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
              <div className="relative z-10 space-y-8">
                 <h2 className="text-4xl md:text-6xl font-bold tracking-tight">Ready to deploy?</h2>
                 <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto">
                    Join thousands of developers building the future of the web. Get started for free, no credit card required.
                 </p>
                 <Link to="/auth/signup">
                    <button className="px-8 py-4 bg-white text-primary rounded-xl text-lg font-bold hover:bg-gray-100 transition-colors shadow-xl">
                       Get Started for Free
                    </button>
                 </Link>
              </div>
           </div>
        </section>
      </main>

      <footer className="px-6 py-20 border-t border-border bg-card">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
           <div>
              <div className="flex items-center gap-2 mb-6">
                 <div className="w-6 h-6 bg-primary rounded-md" />
                 <span className="font-bold text-lg">Airstream</span>
              </div>
              <p className="text-sm text-muted-foreground">
                 The modern platform for modern developers. Built with love in San Francisco.
              </p>
           </div>

           {[
              { header: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Docs', 'Integrations'] },
              { header: 'Company', links: ['About', 'Careers', 'Blog', 'Contact', 'Partners'] },
              { header: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Security'] }
           ].map((col, i) => (
              <div key={i}>
                 <h4 className="font-semibold mb-6">{col.header}</h4>
                 <ul className="space-y-4 text-sm text-muted-foreground">
                    {col.links.map(link => (
                       <li key={link}><a href="#" className="hover:text-foreground transition-colors">{link}</a></li>
                    ))}
                 </ul>
              </div>
           ))}
        </div>
        <div className="max-w-7xl mx-auto pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Airstream Inc. All rights reserved.</p>
          <div className="flex gap-6">
             <Wifi size={16} />
             <span>System Status: <span className="text-green-500 font-medium">Operational</span></span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
