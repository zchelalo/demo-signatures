import { useEffect, useRef, useState } from 'react'
import Draggable from 'react-draggable'
import { Document, Page, pdfjs } from 'react-pdf'
import SignatureCanvas from 'react-signature-canvas'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import pdfUrl from './file.pdf'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PlacedSignature {
	id: string
	image: string
	pageIndex: number
	x: number
	y: number
}

function DraggableSignature({
	sig,
	onStop,
	onRemove,
}: {
	sig: PlacedSignature
	onStop: (x: number, y: number) => void
	onRemove: () => void
}) {
	const nodeRef = useRef<HTMLDivElement>(null)

	return (
		<Draggable
			nodeRef={nodeRef}
			bounds='parent'
			position={{ x: sig.x, y: sig.y }}
			onStop={(_e, data) => onStop(data.x, data.y)}
		>
			<div
				ref={nodeRef}
				className='absolute top-0 left-0 z-50 cursor-grab active:cursor-grabbing group'
				style={{ width: '200px' }}
			>
				<div className='relative'>
					<img
						src={sig.image}
						className='w-full bg-white/50 border-2 border-dashed border-indigo-500 p-1 rounded-lg transition-all group-hover:bg-white group-hover:shadow-xl'
						alt='Firma'
						draggable={false}
					/>
					<button
						type='button'
						onClick={(e) => {
							e.stopPropagation()
							onRemove()
						}}
						className='absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-60'
					>
						<svg
							className='w-3 h-3'
							fill='none'
							stroke='currentColor'
							viewBox='0 0 24 24'
						>
							<title>Eliminar firma</title>
							<path
								strokeLinecap='round'
								strokeLinejoin='round'
								strokeWidth='2'
								d='M6 18L18 6M6 6l12 12'
							/>
						</svg>
					</button>
				</div>
			</div>
		</Draggable>
	)
}

export function App() {
	const [signatures, setSignatures] = useState<PlacedSignature[]>([])
	const [numPages, setNumPages] = useState<number>(0)
	const [currentPage, setCurrentPage] = useState<number>(1)
	const [pageWidth, setPageWidth] = useState<number>(0)
	const [pageHeights, setPageHeights] = useState<Record<number, number>>({})

	const sigPad = useRef<SignatureCanvas | null>(null)
	const containerRef = useRef<HTMLDivElement>(null)

	const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
		setNumPages(numPages)
		setCurrentPage(1)
	}

	const saveSignature = () => {
		if (sigPad.current) {
			if (sigPad.current.isEmpty()) {
				alert('Por favor, firma antes de continuar.')
				return
			}
			const newSignature: PlacedSignature = {
				id: `sig-${Date.now()}`,
				image: sigPad.current.getCanvas().toDataURL('image/png'),
				pageIndex: currentPage - 1,
				x: 0,
				y: 0,
			}
			setSignatures((prev) => [...prev, newSignature])
			sigPad.current.clear()
		}
	}

	const clearPad = () => {
		if (sigPad.current) sigPad.current.clear()
	}

	const removeSignature = (id: string) => {
		setSignatures((prev) => prev.filter((s) => s.id !== id))
	}

	const updateSignaturePosition = (id: string, x: number, y: number) => {
		setSignatures((prev) => prev.map((s) => (s.id === id ? { ...s, x, y } : s)))
	}

	const goToPrevPage = () => {
		if (currentPage > 1) setCurrentPage(currentPage - 1)
	}

	const goToNextPage = () => {
		if (currentPage < numPages) setCurrentPage(currentPage + 1)
	}

	const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = Number.parseInt(e.target.value, 10)
		if (!Number.isNaN(value) && value >= 1 && value <= numPages) {
			setCurrentPage(value)
		}
	}

	useEffect(() => {
		const updateWidth = () => {
			if (containerRef.current) {
				const availableWidth = containerRef.current.clientWidth - 24
				setPageWidth(availableWidth)
			}
		}
		updateWidth()
		window.addEventListener('resize', updateWidth)
		return () => window.removeEventListener('resize', updateWidth)
	}, [])

	const handleFinalConfirm = () => {
		if (signatures.length === 0) return
		const dataForBackend = signatures.map((sig) => ({
			signatureBase64: sig.image,
			pageIndex: sig.pageIndex,
			coordX: Math.round(sig.x),
			coordY: Math.round(sig.y),
			viewportWidth: Math.round(pageWidth),
			viewportHeight: Math.round(pageHeights[sig.pageIndex + 1] || 0),
			signatureWidth: 200,
			totalDocumentPages: numPages,
		}))
		console.log('--- DATOS BACKEND ---', dataForBackend)
		alert(
			`SE ENVIARÁN ${signatures.length} FIRMAS AL BACKEND. Revisa la consola.`,
		)
	}

	return (
		<div className='flex flex-col items-center min-h-screen bg-slate-100 p-4 md:p-8 font-sans text-slate-900'>
			<header className='text-center mb-10'>
				<h1 className='text-4xl font-black text-indigo-900 tracking-tighter uppercase'>
					Demo Signature
				</h1>
			</header>

			<main className='w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8'>
				<aside className='lg:col-span-4'>
					<div className='bg-white p-6 rounded-4xl shadow-xl border border-slate-200 lg:sticky lg:top-8'>
						<h2 className='text-xl font-bold mb-6 flex items-center gap-2'>
							<div className='w-1.5 h-6 bg-indigo-600 rounded-full' />
							Configurar Firma
						</h2>

						<div className='bg-slate-50 border-2 border-slate-200 rounded-3xl overflow-hidden mb-6 shadow-inner'>
							<SignatureCanvas
								ref={sigPad}
								canvasProps={{
									className: 'sigCanvas w-full h-48',
									style: { width: '100%', height: '192px' },
								}}
							/>
						</div>

						<div className='grid grid-cols-2 gap-3 mb-8'>
							<button
								type='button'
								onClick={saveSignature}
								className='bg-indigo-600 text-white py-4 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg active:scale-95'
							>
								AÑADIR FIRMA
							</button>
							<button
								type='button'
								onClick={clearPad}
								className='bg-slate-100 text-slate-500 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-colors'
							>
								LIMPIAR PAD
							</button>
						</div>

						{signatures.length > 0 && (
							<div className='space-y-3'>
								<p className='text-[10px] font-black text-slate-400 uppercase tracking-widest'>
									Firmas Colocadas ({signatures.length})
								</p>
								<div className='max-h-60 overflow-y-auto space-y-2 pr-2'>
									{signatures.map((sig, idx) => (
										<div
											key={sig.id}
											className='bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center justify-between group'
										>
											<div className='flex items-center gap-3'>
												<img
													src={sig.image}
													alt='Min'
													className='w-8 h-8 bg-white border rounded p-1 object-contain'
												/>
												<div>
													<p className='text-[10px] font-bold'>
														Firma #{idx + 1}
													</p>
													<p className='text-[9px] text-slate-500'>
														Página {sig.pageIndex + 1}
													</p>
												</div>
											</div>
											<button
												type='button'
												onClick={() => removeSignature(sig.id)}
												className='p-2 text-slate-400 hover:text-red-500 transition-colors'
											>
												<svg
													className='w-4 h-4'
													fill='none'
													stroke='currentColor'
													viewBox='0 0 24 24'
												>
													<title>Eliminar firma</title>
													<path
														strokeLinecap='round'
														strokeLinejoin='round'
														strokeWidth='2'
														d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
													/>
												</svg>
											</button>
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				</aside>

				<section className='lg:col-span-8' ref={containerRef}>
					<div className='bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden relative'>
						<div className='p-6 md:p-8 flex items-center justify-between border-b border-slate-100 bg-slate-50/50'>
							<div className='flex items-center gap-4'>
								<h2 className='text-xl font-bold flex items-center gap-2 text-slate-800'>
									<div className='w-1.5 h-6 bg-indigo-600 rounded-full' />
									Visor de Documento
								</h2>
								<div className='flex items-center bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-sm gap-2'>
									<button
										type='button'
										onClick={goToPrevPage}
										disabled={currentPage === 1}
										className='p-1.5 hover:bg-slate-100 disabled:opacity-20 rounded-lg transition-colors cursor-pointer text-slate-600'
									>
										<svg
											className='w-5 h-5'
											fill='none'
											stroke='currentColor'
											viewBox='0 0 24 24'
										>
											<title>Anterior</title>
											<path
												strokeLinecap='round'
												strokeLinejoin='round'
												strokeWidth='2'
												d='M15 19l-7-7 7-7'
											/>
										</svg>
									</button>
									<div className='flex items-center gap-1.5 px-2'>
										<input
											type='number'
											min={1}
											max={numPages}
											value={currentPage}
											onChange={handlePageInputChange}
											className='w-12 h-8 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all'
										/>
										<span className='text-[10px] font-black text-slate-400 uppercase tracking-tighter'>
											/ {numPages || '--'}
										</span>
									</div>
									<button
										type='button'
										onClick={goToNextPage}
										disabled={currentPage === numPages}
										className='p-1.5 hover:bg-slate-100 disabled:opacity-20 rounded-lg transition-colors cursor-pointer text-slate-600'
									>
										<svg
											className='w-5 h-5'
											fill='none'
											stroke='currentColor'
											viewBox='0 0 24 24'
										>
											<title>Siguiente</title>
											<path
												strokeLinecap='round'
												strokeLinejoin='round'
												strokeWidth='2'
												d='M9 5l7 7-7 7'
											/>
										</svg>
									</button>
								</div>
							</div>
						</div>

						<div className='relative'>
							<div
								className='w-full bg-slate-200 overflow-y-auto overflow-x-hidden border-12 border-white'
								style={{ maxHeight: '750px' }}
							>
								<div
									className='relative mx-auto bg-white shadow-lg'
									style={{ width: pageWidth > 0 ? pageWidth : '100%' }}
								>
									<Document file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess}>
										<div className='relative'>
											<Page
												pageNumber={currentPage}
												width={pageWidth > 0 ? pageWidth : 600}
												renderAnnotationLayer={false}
												renderTextLayer={false}
												onLoadSuccess={(page) => {
													setPageHeights((prev) => ({
														...prev,
														[currentPage]: page.height,
													}))
												}}
											/>
										</div>
									</Document>

									{signatures
										.filter((sig) => sig.pageIndex === currentPage - 1)
										.map((sig) => (
											<DraggableSignature
												key={sig.id}
												sig={sig}
												onStop={(x, y) => updateSignaturePosition(sig.id, x, y)}
												onRemove={() => removeSignature(sig.id)}
											/>
										))}
								</div>
							</div>
						</div>

						<div className='p-8 flex flex-col md:flex-row justify-end items-center gap-6 bg-slate-50 border-t border-slate-100'>
							<button
								type='button'
								onClick={handleFinalConfirm}
								disabled={signatures.length === 0}
								className={`w-full md:w-auto px-12 py-5 rounded-2xl font-black text-lg transition-all transform shadow-2xl ${
									signatures.length > 0
										? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-1 shadow-indigo-200'
										: 'bg-slate-200 text-slate-300 cursor-not-allowed shadow-none'
								}`}
							>
								FINALIZAR DOCUMENTO ({signatures.length})
							</button>
						</div>
					</div>
				</section>
			</main>
		</div>
	)
}
