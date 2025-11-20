import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  GraduationCap,
  Users,
  BookOpen,
  Calendar,
  TrendingUp,
  Shield,
  ArrowRight,
  CheckCircle,
  UserCheck,
  ClipboardList,
  MessageSquare,
  FileText,
  BarChart3,
  Bell
} from 'lucide-react';

export function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Users className="h-8 w-8 text-blue-600" />,
      title: "Student Management",
      description: "Comprehensive student information system with attendance tracking and performance analytics"
    },
    {
      icon: <BookOpen className="h-8 w-8 text-green-600" />,
      title: "Academic Excellence",
      description: "Complete curriculum management, timetable scheduling, and exam management"
    },
    {
      icon: <Calendar className="h-8 w-8 text-purple-600" />,
      title: "Smart Scheduling",
      description: "Automated timetable generation with conflict detection and substitute teacher management"
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-orange-600" />,
      title: "Fee Management",
      description: "Streamlined fee collection, online payments, and automated reminders"
    },
    {
      icon: <Shield className="h-8 w-8 text-red-600" />,
      title: "Secure & Reliable",
      description: "Role-based access control with comprehensive audit logs"
    },
    {
      icon: <GraduationCap className="h-8 w-8 text-indigo-600" />,
      title: "Parent Portal",
      description: "Real-time updates on student progress, attendance, and school announcements"
    }
  ];

  const roleFeatures = [
    {
      role: "Admin",
      icon: <Shield className="h-12 w-12 text-red-600" />,
      color: "from-red-500 to-pink-500",
      features: [
        { icon: <Users />, text: "Manage Students, Teachers & Parents" },
        { icon: <BarChart3 />, text: "Analytics & Reports Dashboard" },
        { icon: <TrendingUp />, text: "Fee Management & Collection" },
        { icon: <ClipboardList />, text: "User Management & Permissions" },
        { icon: <FileText />, text: "System Settings & Configuration" }
      ]
    },
    {
      role: "Teachers",
      icon: <GraduationCap className="h-12 w-12 text-blue-600" />,
      color: "from-blue-500 to-cyan-500",
      features: [
        { icon: <BookOpen />, text: "Manage Classes & Subjects" },
        { icon: <ClipboardList />, text: "Mark Attendance & Grades" },
        { icon: <Calendar />, text: "View & Manage Timetable" },
        { icon: <FileText />, text: "Create & Grade Exams" },
        { icon: <MessageSquare />, text: "Communicate with Parents" }
      ]
    },
    {
      role: "Students",
      icon: <BookOpen className="h-12 w-12 text-green-600" />,
      color: "from-green-500 to-emerald-500",
      features: [
        { icon: <Calendar />, text: "View Class Timetable" },
        { icon: <ClipboardList />, text: "Check Attendance & Grades" },
        { icon: <FileText />, text: "Access Course Materials" },
        { icon: <TrendingUp />, text: "View Exam Results" },
        { icon: <MessageSquare />, text: "Receive Announcements" }
      ]
    },
    {
      role: "Parents",
      icon: <UserCheck className="h-12 w-12 text-purple-600" />,
      color: "from-purple-500 to-pink-500",
      features: [
        { icon: <Users />, text: "Monitor Child's Progress" },
        { icon: <ClipboardList />, text: "View Attendance & Grades" },
        { icon: <TrendingUp />, text: "Track Fee Payments" },
        { icon: <Bell />, text: "Receive School Notifications" },
        { icon: <MessageSquare />, text: "Communicate with Teachers" }
      ]
    }
  ];

  const stats = [
    { label: "Students", value: "1000+" },
    { label: "Teachers", value: "50+" },
    { label: "Classes", value: "30+" },
    { label: "Success Rate", value: "98%" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <GraduationCap className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              EduManage Pro
            </span>
          </div>
          <Button onClick={() => navigate('/login')} size="lg" className="group">
            Sign In
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent leading-tight">
            Modern School Management Made Simple
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Streamline your institution's operations with our comprehensive, cloud-based school management system designed for the digital age.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="text-lg px-8 group hover:shadow-lg transition-all" 
              onClick={() => navigate('/login')}
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 hover:shadow-lg transition-all">
              Watch Demo
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-4xl mx-auto">
          {stats.map((stat, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-blue-600 mb-2">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Role-Based Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Tailored for Every Role</h2>
            <p className="text-xl text-gray-600">Powerful features designed for each user type</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {roleFeatures.map((roleFeature, index) => (
              <Card 
                key={index} 
                className="hover:shadow-2xl transition-all hover:-translate-y-2 overflow-hidden"
              >
                <CardHeader className={`bg-gradient-to-r ${roleFeature.color} text-white pb-6`}>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl font-bold">{roleFeature.role}</CardTitle>
                    {roleFeature.icon}
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {roleFeature.features.map((feature, fIndex) => (
                      <div key={fIndex} className="flex items-start space-x-3 group">
                        <div className="mt-1 text-gray-400 group-hover:text-blue-600 transition-colors">
                          {feature.icon}
                        </div>
                        <span className="text-gray-700 group-hover:text-gray-900 transition-colors">
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Powerful Features</h2>
            <p className="text-xl text-gray-600">Everything you need to manage your school efficiently</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-xl transition-all hover:-translate-y-1">
                <CardContent className="pt-6">
                  <div className="mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-8">Why Choose EduManage Pro?</h2>
            <div className="grid md:grid-cols-2 gap-6 text-left">
              {[
                "Real-time attendance tracking and notifications",
                "Automated fee collection with payment reminders",
                "Comprehensive academic performance analytics",
                "Seamless parent-teacher communication",
                "Mobile-friendly interface for on-the-go access",
                "24/7 customer support and assistance"
              ].map((benefit, index) => (
                <div key={index} className="flex items-center space-x-3 group">
                  <CheckCircle className="h-6 w-6 flex-shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="text-lg">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Transform Your School?</h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Join hundreds of schools already using EduManage Pro to streamline their operations
          </p>
          <Button 
            size="lg" 
            className="text-lg px-12 group hover:shadow-xl transition-all" 
            onClick={() => navigate('/login')}
          >
            Start Free Trial
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <GraduationCap className="h-6 w-6" />
                <span className="text-xl font-bold">EduManage Pro</span>
              </div>
              <p className="text-gray-400">Modern school management for the digital age</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li className="hover:text-white cursor-pointer transition-colors">Features</li>
                <li className="hover:text-white cursor-pointer transition-colors">Pricing</li>
                <li className="hover:text-white cursor-pointer transition-colors">Demo</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li className="hover:text-white cursor-pointer transition-colors">Documentation</li>
                <li className="hover:text-white cursor-pointer transition-colors">Contact Us</li>
                <li className="hover:text-white cursor-pointer transition-colors">FAQ</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li className="hover:text-white cursor-pointer transition-colors">Privacy Policy</li>
                <li className="hover:text-white cursor-pointer transition-colors">Terms of Service</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} EduManage Pro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
