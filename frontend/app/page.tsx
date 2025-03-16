"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="container mx-auto py-4 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-[#0055FF] flex items-center justify-center text-white font-bold text-xl mr-2">
            D
          </div>
          <span className="text-xl font-semibold text-gray-900">DataSync</span>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/login" className="text-gray-600 hover:text-gray-900">
            Log in
          </Link>
          <Link href="/signup">
            <Button variant="outline" className="border-[#0055FF] text-[#0055FF] hover:bg-[#0055FF]/10">
              Sign up
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 container mx-auto">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Introducing DataSync AI Platform
          </h1>
          <h2 className="text-2xl md:text-3xl font-bold text-[#0055FF] mb-4">
            Connect your data, unleash AI insights.
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            A multi-tenant platform that connects your organization's data sources to powerful AI agents, 
            providing actionable insights and automated analysis.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button className="bg-[#0055FF] hover:bg-[#0044CC] text-white py-2 px-6 rounded-lg">
              Get started now
            </Button>
            <Button variant="outline" className="border-gray-300 text-gray-700">
              Try demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Icons Grid */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 text-center">
            {[
              { name: "AI Agents", icon: "🤖" },
              { name: "Data Sources", icon: "📊" },
              { name: "Dashboards", icon: "📈" },
              { name: "Automation", icon: "⚙️" },
            ].map((feature, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="w-16 h-16 flex items-center justify-center rounded-full bg-white shadow-sm text-2xl mb-3">
                  {feature.icon}
                </div>
                <h3 className="font-medium text-gray-900">{feature.name}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Features Section */}
      <section className="py-16 sm:py-24 container mx-auto px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            All-in-one platform for your data needs
          </h2>
          <p className="text-lg text-gray-600">
            Connect, analyze, and visualize your data with powerful AI tools designed for the modern enterprise.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              title: "AI Agents",
              description: "Create custom AI agents trained on your organization's data to answer complex questions and generate insights."
            },
            {
              title: "Data Integration",
              description: "Connect to various data sources including databases, APIs, and file imports with secure, reliable syncing."
            },
            {
              title: "Interactive Dashboards",
              description: "Build beautiful, interactive dashboards that visualize your data and AI-generated insights."
            },
            {
              title: "Enterprise Security",
              description: "Role-based access control, multi-tenant isolation, and end-to-end encryption for your sensitive data."
            },
            {
              title: "Automated Workflows",
              description: "Create automated workflows that trigger actions based on your data and AI insights."
            },
            {
              title: "Multi-tenant Ready",
              description: "Built for organizations with multiple teams, departments, or client organizations."
            }
          ].map((feature, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="w-10 h-10 rounded-full bg-[#0055FF]/10 flex items-center justify-center text-[#0055FF] mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Ready to transform your data experience?
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Join thousands of organizations using DataSync AI to unlock insights and drive business decisions.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button className="bg-[#0055FF] hover:bg-[#0044CC] text-white py-2 px-6 rounded-lg">
                Get started for free
              </Button>
              <Button variant="outline" className="border-gray-300 text-gray-700">
                Try demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12 border-t border-gray-100">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 rounded-full bg-[#0055FF] flex items-center justify-center text-white font-bold mr-2">
                D
              </div>
              <span className="text-lg font-semibold text-gray-900">DataSync</span>
            </div>
            <p className="text-gray-600 mb-8">Connect your data, unleash AI insights.</p>
            <p className="text-sm text-gray-500">© 2025 DataSync AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

