'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

export default function GuidePage() {
    return (
        <div className="relative">
            {/* TODO: Add back in later on */}
            {/* <div className="absolute left-8 top-8 p-4 bg-white/80 rounded-lg">
                <Link href="https://runsift.com" target="_blank" rel="noopener noreferrer">
                    <Image 
                        src="/sift-dev-logo-light.svg" 
                        alt="Sift Logo"     
                        width={140} 
                        height={45} 
                        className="hover:opacity-80 transition-opacity"
                    />
                </Link>
            </div> */}
            
            <div className="max-w-4xl mx-auto py-8 px-4">
                <div className="mb-8">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-6"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        <span className="text-sm font-medium">Back to Dashboard</span>
                    </Link>
                    <h1 className="text-3xl font-bold mb-4">Getting Started Guide</h1>
                    <p className="text-slate-600 mb-8">
                        Choose your preferred language or framework to get started with Sift Dev logging integration.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Python Card */}
                    <Link href="/docs/python" className="block">
                        <div className="p-6 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-blue-100">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-slate-800">Python</h3>
                                <div className="p-2 rounded-full bg-blue-100">
                                    <div className="w-6 h-6 flex items-center justify-center">
                                        <svg viewBox="0 0 256 255" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin meet" className="w-5 h-5">
                                            <defs>
                                                <linearGradient x1="12.959%" y1="12.039%" x2="79.639%" y2="78.201%" id="a">
                                                    <stop stopColor="#387EB8" offset="0%"/>
                                                    <stop stopColor="#366994" offset="100%"/>
                                                </linearGradient>
                                                <linearGradient x1="19.128%" y1="20.579%" x2="90.742%" y2="88.429%" id="b">
                                                    <stop stopColor="#FFE052" offset="0%"/>
                                                    <stop stopColor="#FFC331" offset="100%"/>
                                                </linearGradient>
                                            </defs>
                                            <path d="M126.916.072c-64.832 0-60.784 28.115-60.784 28.115l.072 29.128h61.868v8.745H41.631S.145 61.355.145 126.77c0 65.417 36.21 63.097 36.21 63.097h21.61v-30.356s-1.165-36.21 35.632-36.21h61.362s34.475.557 34.475-33.319V33.97S194.67.072 126.916.072zM92.802 19.66a11.12 11.12 0 0 1 11.13 11.13 11.12 11.12 0 0 1-11.13 11.13 11.12 11.12 0 0 1-11.13-11.13 11.12 11.12 0 0 1 11.13-11.13z" fill="url(#a)"/>
                                            <path d="M128.757 254.126c64.832 0 60.784-28.115 60.784-28.115l-.072-29.127H127.6v-8.745h86.441s41.486 4.705 41.486-60.712c0-65.416-36.21-63.096-36.21-63.096h-21.61v30.355s1.165 36.21-35.632 36.21h-61.362s-34.475-.557-34.475 33.32v56.013s-5.235 33.897 62.518 33.897zm34.114-19.586a11.12 11.12 0 0 1-11.13-11.13 11.12 11.12 0 0 1 11.13-11.131 11.12 11.12 0 0 1 11.13 11.13 11.12 11.12 0 0 1-11.13 11.13z" fill="url(#b)"/>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            <p className="text-slate-600 text-sm mb-4">
                                Python integration with context capture and structured logging.
                            </p>
                            <div className="text-blue-600 text-sm font-medium">
                                View Setup Guide →
                            </div>
                        </div>
                    </Link>

                    {/* Flask Card */}
                    <Link href="/docs/flask" className="block">
                        <div className="p-6 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-blue-100">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-slate-800">Flask</h3>
                                <div className="p-2 rounded-full bg-green-100">
                                    <div className="w-6 h-6 flex items-center justify-center">
                                        🌶️
                                    </div>
                                </div>
                            </div>
                            <p className="text-slate-600 text-sm mb-4">
                                Integration for Flask web apps with middleware support.
                            </p>
                            <div className="text-blue-600 text-sm font-medium">
                                View Setup Guide →
                            </div>
                        </div>
                    </Link>

                    {/* FastAPI Card */}
                    <Link href="/docs/fastapi" className="block">
                        <div className="p-6 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-blue-100">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-slate-800">FastAPI</h3>
                                <div className="p-2 rounded-full bg-teal-100">
                                    <div className="w-6 h-6 flex items-center justify-center">
                                        ⚡
                                    </div>
                                </div>
                            </div>
                            <p className="text-slate-600 text-sm mb-4">
                                Integration for FastAPI web apps with async support.
                            </p>
                            <div className="text-blue-600 text-sm font-medium">
                                View Setup Guide →
                            </div>
                        </div>
                    </Link>

                    {/* Node.js (JavaScript) Card */}
                    <Link href="/docs/javascript" className="block">
                        <div className="p-6 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-blue-100">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-slate-800">Node.js (JS)</h3>
                                <div className="p-2 rounded-full bg-green-100">
                                    <div className="w-6 h-6 flex items-center justify-center">
                                        <svg viewBox="0 0 256 289" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid" className="w-5 h-5">
                                            <path d="M128 288.464c-3.975 0-7.685-1.06-11.13-2.915l-35.247-20.936c-5.3-2.915-2.65-3.975-1.06-4.505 7.155-2.385 8.48-2.915 15.9-7.156.796-.53 1.856-.265 2.65.265l27.032 16.166c1.06.53 2.385.53 3.18 0l105.74-61.217c1.06-.53 1.59-1.59 1.59-2.915v-122.17c0-1.325-.53-2.385-1.59-2.915l-105.74-60.953c-1.06-.53-2.385-.53-3.18 0L20.405 80.868c-1.06.53-1.59 1.855-1.59 2.915v122.17c0 1.06.53 2.385 1.59 2.915l28.887 16.695c15.635 7.95 25.44-1.325 25.44-10.6V94.033c0-1.59 1.326-3.18 3.181-3.18h13.516c1.59 0 3.18 1.325 3.18 3.18v120.58c0 20.936-11.396 33.126-31.272 33.126-6.095 0-10.865 0-24.38-6.625l-27.827-15.9C4.24 220.885 0 213.465 0 205.515V83.348c0-7.95 4.24-15.37 11.13-19.345L116.87 2.783c6.625-3.71 15.635-3.71 22.26 0L244.87 64c6.89 3.975 11.13 11.395 11.13 19.345v122.17c0 7.95-4.24 15.37-11.13 19.346l-105.74 61.218c-3.445 1.59-7.42 2.385-11.13 2.385zm32.596-84.009c-46.377 0-55.917-21.2-55.917-39.221 0-1.59 1.325-3.18 3.18-3.18h13.78c1.59 0 2.916 1.06 2.916 2.65 2.12 14.045 8.215 20.936 36.306 20.936 22.261 0 31.802-5.035 31.802-16.96 0-6.891-2.65-11.926-37.367-15.372-28.886-2.915-46.907-9.275-46.907-32.33 0-21.467 18.02-34.187 48.232-34.187 33.921 0 50.617 11.66 52.737 37.101 0 .795-.265 1.59-.795 2.385-.53.53-1.325 1.06-2.12 1.06h-13.78c-1.326 0-2.65-1.06-2.916-2.385-3.18-14.575-11.395-19.345-33.126-19.345-24.38 0-27.296 8.48-27.296 14.84 0 7.686 3.445 10.07 36.306 14.31 32.597 4.24 47.967 10.336 47.967 33.127-.265 23.321-19.345 36.571-53.002 36.571z" fill="#539E43"/>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            <p className="text-slate-600 text-sm mb-4">
                                Node.js integration with JavaScript, supporting both CommonJS and ES Modules.
                            </p>
                            <div className="text-blue-600 text-sm font-medium">
                                View Setup Guide →
                            </div>
                        </div>
                    </Link>

                    {/* Node.js (TypeScript) Card */}
                    <Link href="/docs/typescript" className="block">
                        <div className="p-6 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-blue-100">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-slate-800">Node.js (TS)</h3>
                                <div className="p-2 rounded-full bg-blue-100">
                                    <div className="w-6 h-6 flex items-center justify-center">
                                        <svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid" className="w-5 h-5">
                                            <path fill="#3178C6" d="M0 128v128h256V0H0z"/>
                                            <path fill="#FFF" d="M56.611 128.85l-.081 10.483h33.32v94.68h23.57v-94.68h33.32v-10.28c0-5.69-.122-10.444-.284-10.566-.122-.162-20.399-.244-44.983-.203l-44.739.122-.122 10.443Zm149.955-10.742c6.501 1.625 11.459 4.51 16.01 9.224 2.357 2.52 5.851 7.112 6.136 8.209.08.325-11.053 7.802-17.798 11.987-.244.163-1.22-.894-2.317-2.52-3.291-4.794-6.745-6.867-12.028-7.232-7.76-.529-12.759 3.535-12.718 10.32 0 1.992.284 3.17 1.097 4.795 1.707 3.536 4.876 5.649 14.832 9.956 18.326 7.883 26.168 13.084 31.045 20.48 5.445 8.249 6.664 21.415 2.966 31.208-4.063 10.646-14.14 17.879-28.323 20.276-4.388.772-14.79.65-19.504-.203-10.28-1.828-20.033-6.908-26.047-13.572-2.357-2.601-6.949-9.387-6.664-9.875.122-.162 1.178-.812 2.356-1.503 1.138-.65 5.446-3.129 9.509-5.485l7.355-4.267 1.544 2.276c2.154 3.29 6.867 7.801 9.712 9.305 8.167 4.307 19.383 3.698 24.909-1.26 2.357-2.153 3.332-4.388 3.332-7.68 0-2.966-.366-4.266-1.91-6.501-1.99-2.845-6.054-5.242-17.595-10.24-13.206-5.69-18.895-9.224-24.096-14.832-3.007-3.25-5.852-8.452-7.03-12.8-.975-3.617-1.22-12.678-.447-16.335 2.723-12.76 12.353-21.658 26.25-24.3 4.51-.853 14.994-.528 19.424.569Z"/>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            <p className="text-slate-600 text-sm mb-4">
                                Node.js integration with TypeScript, featuring full type safety and async support.
                            </p>
                            <div className="text-blue-600 text-sm font-medium">
                                View Setup Guide →
                            </div>
                        </div>
                    </Link>

                    {/* Coming Soon Cards */}
                    {/* <div className="block">
                        <div className="p-6 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-blue-100 opacity-75">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-slate-800">React (TS)</h3>
                                <div className="p-2 rounded-full bg-cyan-100">
                                    <div className="w-6 h-6 flex items-center justify-center">
                                        ⚛️
                                    </div>
                                </div>
                            </div>
                            <p className="text-slate-600 text-sm mb-4">
                                Integration for React applications with TypeScript support.
                            </p>
                            <div className="text-blue-600 text-sm font-medium">
                                Coming Soon →
                            </div>
                        </div>
                    </div> */}

                    <div className="block">
                        <div className="p-6 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-blue-100 opacity-75">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-slate-800">Express (TS)</h3>
                                <div className="p-2 rounded-full bg-gray-100">
                                    <div className="w-6 h-6 flex items-center justify-center">
                                        🚂
                                    </div>
                                </div>
                            </div>
                            <p className="text-slate-600 text-sm mb-4">
                                Integration for Express.js apps with TypeScript support.
                            </p>
                            <div className="text-blue-600 text-sm font-medium">
                                Coming Soon →
                            </div>
                        </div>
                    </div>

                    <div className="block">
                    <div className="p-6 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-blue-100 opacity-75">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-800">Electron</h3>
                            <div className="p-2 rounded-full bg-purple-100">
                                <div className="w-6 h-6 flex items-center justify-center">
                                    ⚡
                                </div>
                            </div>
                        </div>
                        <p className="text-slate-600 text-sm mb-4">
                            Integration for Electron desktop apps with both JavaScript and TypeScript support.
                        </p>
                        <div className="text-blue-600 text-sm font-medium">
                            Coming Soon →
                        </div>
                    </div>
                </div>
                </div>
            </div>
        </div>
    );
} 