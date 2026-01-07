import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Server, Smartphone, Sparkles, CheckSquare, ArrowRight, Pickaxe, Layers, Plug, Brain, ChevronRight } from 'lucide-react';
import CodePreview from '@/components/landing/CodePreview';

export default function LandingPage() {
	return (
		<div className="min-h-[calc(100vh-8rem)] relative flex flex-col items-center overflow-x-hidden mc-sky-bg font-pixel text-lg">

			{/* Minecraft-like Background Pattern */}
			<div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

			<div className="w-full max-w-7xl mx-auto px-6 relative z-10 py-12">

				{/* Split Hero Section */}
				<div className="grid lg:grid-cols-[1.5fr_1fr] gap-12 lg:gap-20 items-center mb-32 lg:mb-48 mt-8 lg:mt-16">

					{/* Left Column: Text & CTA */}
					<div className="text-left bg-secondary/10 p-8 rounded-3xl backdrop-blur-sm border-4 border-black/10">
						<div className="inline-flex items-center gap-2 px-4 py-2 bg-white border-4 border-black shadow-pixel text-black text-xl mb-8 transform -rotate-2 hover:rotate-0 transition-transform">
							<Pickaxe className="h-5 w-5 fill-black" />
							<span className="tracking-wide uppercase">Mine Your Data</span>
						</div>

						<h1 className="text-6xl lg:text-7xl text-black mb-6 leading-[0.9] tracking-tighter drop-shadow-sm font-pixel-heading">
							CRAFT YOUR <br />
							<span className="text-primary">DATABASE</span> SKILLS
						</h1>

						<p className="text-2xl text-stone-700 mb-8 max-w-xl leading-relaxed tracking-wide font-pixel-body">
							Block by block. Dig deep into data structures, learn SQL, and earn valid certifications in a world built for builders.
						</p>

						<div className="flex flex-col sm:flex-row gap-12 mb-20">
							<Link href="/login" className="w-full sm:w-auto">
								<Button size="lg" className="w-full sm:w-auto px-10 h-18 text-2xl mc-btn-primary hover:translate-y-1 hover:shadow-none transition-all rounded-xl ring-0 shadow-pixel-lg active:translate-y-2 active:shadow-none">
									START JOURNEY NOW
									<ArrowRight className="ml-4 h-8 w-8" />
								</Button>
							</Link>
						</div>

						{/* Game Perks / Feature Badges */}
						<div className="flex flex-wrap gap-y-4 gap-x-6 text-lg text-stone-800 font-bold">
							<div className="flex items-center gap-3 bg-white/50 px-3 py-1 rounded-lg border-2 border-black/10">
								<div className="bg-primary/20 p-1 rounded">
									<CheckSquare className="h-5 w-5 text-primary" />
								</div>
								<span>SQL Mastery XP</span>
							</div>
							<div className="flex items-center gap-3 bg-white/50 px-3 py-1 rounded-lg border-2 border-black/10">
								<div className="bg-primary/20 p-1 rounded">
									<Sparkles className="h-5 w-5 text-primary" />
								</div>
								<span>Puzzle-Based Levels</span>
							</div>
							<div className="flex items-center gap-3 bg-white/50 px-3 py-1 rounded-lg border-2 border-black/10">
								<div className="bg-primary/20 p-1 rounded">
									<CheckSquare className="h-5 w-5 text-primary" />
								</div>
								<span>Skill Badges & Certs</span>
							</div>
						</div>
					</div>

					{/* Right Column: Code Preview Visual */}
					<div className="relative hidden lg:block">
						{/* Background splash behind code preview */}
						<div className="absolute top-8 -right-8 w-full h-full bg-stone-300 border-4 border-black shadow-pixel -z-10 rotate-3"></div>
						<CodePreview />
					</div>
				</div>
			</div>





			{/* Underground Features Section */}
			<div className="w-full mc-sky-bg relative z-10 py-32 px-6">
				<div className="absolute inset-0 bg-black/5 pointer-events-none"></div>
				<div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

				<div className="max-w-7xl mx-auto relative z-10">
					{/* Feature Section Header */}
					<div className="text-center mb-20 relative">
						<div className="inline-flex items-center justify-center gap-3 mb-4">
							<div className="h-1 w-12 bg-black/20 rounded-full"></div>
							<Pickaxe className="w-8 h-8 text-stone-700 animate-bounce" />
							<div className="h-1 w-12 bg-black/20 rounded-full"></div>
						</div>

						<h2 className="text-5xl lg:text-6xl text-black mb-4 font-pixel-heading drop-shadow-sm">WHY MINDCRAFT?</h2>
						<p className="text-2xl text-stone-600 font-pixel-body max-w-2xl mx-auto">
							Learn databases like building worlds.
						</p>
					</div>

					{/* Feature Cards Grid */}
					<div className="grid md:grid-cols-3 gap-8 mb-20">
						{/* Card 1 */}
						<div className="bg-white border-4 border-black p-8 flex flex-col items-center text-center relative group transition-all duration-300 hover:-translate-y-2 rounded-xl"
							style={{ boxShadow: '4px 4px 0 #3B6EA5, 8px 8px 0 rgba(27, 27, 27, 0.2)' }}>

							<div className="absolute -top-6 bg-primary border-4 border-black p-3 rounded-lg shadow-pixel group-hover:scale-110 transition-transform">
								<Layers className="h-12 w-12 text-white" />
							</div>

							<div className="mt-12 mb-6">
								<h3 className="text-3xl text-black mb-2 font-bold leading-none">Structured Queries</h3>
								<p className="text-stone-500 font-bold text-lg">Query like a pro builder</p>
							</div>

							<p className="text-lg text-stone-700 leading-relaxed mb-8 flex-grow">
								Master SELECT, JOIN, and GROUP BY through hands-on challenges that visualize how data blocks flow.
							</p>


						</div>

						{/* Card 2 */}
						<div className="bg-white border-4 border-black p-8 flex flex-col items-center text-center relative group transition-all duration-300 hover:-translate-y-2 rounded-xl"
							style={{ boxShadow: '4px 4px 0 #3B6EA5, 8px 8px 0 rgba(27, 27, 27, 0.2)' }}>

							<div className="absolute -top-6 bg-[#3B6EA5] border-4 border-black p-3 rounded-lg shadow-pixel group-hover:scale-110 transition-transform">
								<Server className="h-12 w-12 text-white" />
							</div>

							<div className="mt-12 mb-6">
								<h3 className="text-3xl text-black mb-2 font-bold leading-none">Server Architecture</h3>
								<p className="text-stone-500 font-bold text-lg">Design systems that scale</p>
							</div>

							<p className="text-lg text-stone-700 leading-relaxed mb-8 flex-grow">
								Understand how databases scale. Build imaginary server racks and optimize your redstone circuits.
							</p>


						</div>

						{/* Card 3 */}
						<div className="bg-white border-4 border-black p-8 flex flex-col items-center text-center relative group transition-all duration-300 hover:-translate-y-2 rounded-xl"
							style={{ boxShadow: '4px 4px 0 #3B6EA5, 8px 8px 0 rgba(27, 27, 27, 0.2)' }}>

							<div className="absolute -top-6 bg-[#F59E0B] border-4 border-black p-3 rounded-lg shadow-pixel group-hover:scale-110 transition-transform">
								<Plug className="h-12 w-12 text-white" />
							</div>

							<div className="mt-12 mb-6">
								<h3 className="text-3xl text-black mb-2 font-bold leading-none">App Integration</h3>
								<p className="text-stone-500 font-bold text-lg">Connect worlds together</p>
							</div>

							<p className="text-lg text-stone-700 leading-relaxed mb-8 flex-grow">
								Connect your backend to front-end apps. Learn API design and JSON data structures in a gamified way.
							</p>

						</div>
					</div>

					{/* Bottom Soft CTA - Removed */}
				</div>
			</div>

		</div>
	);
}
