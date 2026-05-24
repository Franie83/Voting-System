import React from 'react'
import { Vote, Mail, Phone, MapPin } from 'lucide-react'

const Footer = () => {
  return (
    <footer className="bg-ican-primary text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Vote className="h-6 w-6 text-ican-accent" />
              <span className="font-bold text-lg">ICAN Voting System</span>
            </div>
            <p className="text-gray-300 text-sm">
              Secure, transparent, and auditable electronic voting for the Institute of Chartered Accountants of Nigeria.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><a href="/elections" className="hover:text-white">Active Elections</a></li>
              <li><a href="/results" className="hover:text-white">Results</a></li>
              <li><a href="/audit" className="hover:text-white">Audit Trail</a></li>
              <li><a href="#" className="hover:text-white">Help Center</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Contact</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>elections@ican.org.ng</span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <span>+234 1 277 0000</span>
              </li>
              <li className="flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span>Lagos, Nigeria</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-ican-secondary mt-8 pt-4 text-center text-sm text-gray-400">
          <p> 2024 Institute of Chartered Accountants of Nigeria. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
