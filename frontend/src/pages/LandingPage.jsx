import React from 'react'
import { Link } from 'react-router-dom'
import { Vote, Shield, BarChart3, Users, Lock, Globe } from 'lucide-react'

const LandingPage = () => {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-ican-primary text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Secure Electronic Voting for <span className="text-ican-accent">ICAN</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Transparent, auditable, and fraud-resistant elections for the Institute of Chartered Accountants of Nigeria
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/login" className="btn-primary text-lg px-8 py-4">
                Cast Your Vote
              </Link>
              <Link to="/elections" className="btn-secondary text-lg px-8 py-4">
                View Elections
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-ican-primary dark:text-white">
            Why Choose ICAN Electronic Voting?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Shield className="h-12 w-12 text-ican-accent" />}
              title="Military-Grade Security"
              description="AES-256 encryption, device fingerprinting, and multi-factor authentication ensure your vote is secure."
            />
            <FeatureCard 
              icon={<BarChart3 className="h-12 w-12 text-ican-accent" />}
              title="Real-Time Analytics"
              description="Monitor voter turnout, geographic participation, and election progress in real-time."
            />
            <FeatureCard 
              icon={<Lock className="h-12 w-12 text-ican-accent" />}
              title="Anonymous Voting"
              description="Your vote is completely anonymous with cryptographic hashing and encrypted storage."
            />
            <FeatureCard 
              icon={<Users className="h-12 w-12 text-ican-accent" />}
              title="Multi-Level Elections"
              description="Support for national, district, chapter, and committee elections with independent configurations."
            />
            <FeatureCard 
              icon={<Globe className="h-12 w-12 text-ican-accent" />}
              title="Vote From Anywhere"
              description="Access the voting platform from any device, anywhere in the world with internet connectivity."
            />
            <FeatureCard 
              icon={<Vote className="h-12 w-12 text-ican-accent" />}
              title="Digital Receipts"
              description="Receive QR-coded digital receipts to verify your vote was recorded correctly."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-ican-primary dark:text-white">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <StepCard number="1" title="Login" description="Enter your membership number and password" />
            <StepCard number="2" title="Verify" description="Enter the OTP sent to your email/phone" />
            <StepCard number="3" title="Select" description="Choose your preferred candidates" />
            <StepCard number="4" title="Confirm" description="Review and confirm your selections" />
            <StepCard number="5" title="Receipt" description="Receive your digital voting receipt" />
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-16 bg-ican-primary text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold mb-8">Trusted by ICAN Members Nationwide</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatCard number="50,000+" label="Registered Members" />
            <StatCard number="100%" label="Secure Encryption" />
            <StatCard number="24/7" label="System Monitoring" />
            <StatCard number="99.9%" label="Uptime Guarantee" />
          </div>
        </div>
      </section>
    </div>
  )
}

const FeatureCard = ({ icon, title, description }) => (
  <div className="card p-6 hover:shadow-lg transition-shadow">
    <div className="mb-4">{icon}</div>
    <h3 className="text-xl font-semibold mb-2 text-ican-primary dark:text-white">{title}</h3>
    <p className="text-gray-600 dark:text-gray-300">{description}</p>
  </div>
)

const StepCard = ({ number, title, description }) => (
  <div className="text-center">
    <div className="w-12 h-12 bg-ican-primary text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
      {number}
    </div>
    <h3 className="font-semibold text-ican-primary dark:text-white mb-2">{title}</h3>
    <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
  </div>
)

const StatCard = ({ number, label }) => (
  <div>
    <div className="text-3xl md:text-4xl font-bold text-ican-accent">{number}</div>
    <div className="text-gray-300 mt-2">{label}</div>
  </div>
)

export default LandingPage
