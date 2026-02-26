import { useEffect, useRef, useState } from 'react'
import Draggable from 'react-draggable'
import { Document, Page, pdfjs } from 'react-pdf'
import SignatureCanvas from 'react-signature-canvas'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import pdfUrl from './file.pdf'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

export function App() {
	const [sigImage, setSigImage] = useState<string | null>(null)
	const [numPages, setNumPages] = useState<number>(0)
	const [currentPage, setCurrentPage] = useState<number>(1)
	const [pageWidth, setPageWidth] = useState<number>(0)
	const [pageHeights, setPageHeights] = useState<Record<number, number>>({})
	const [finalPosition, setFinalPosition] = useState({ x: 0, y: 0 })

	const sigPad = useRef<SignatureCanvas | null>(null)
	const nodeRef = useRef<HTMLDivElement>(null)
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
			setSigImage(sigPad.current.getCanvas().toDataURL('image/png'))
		}
	}

	const clearSignature = () => {
		if (sigPad.current) sigPad.current.clear()
		setSigImage(null)
		setFinalPosition({ x: 0, y: 0 })
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

	// FUNCIÓN PARA PREPARAR EL ENVÍO AL BACKEND
	const handleFinalConfirm = () => {
		const currentPageHeight = pageHeights[currentPage] || 0
		if (!sigImage || currentPageHeight === 0) return

		// La posición Y es relativa a la página actual
		const relativeY = finalPosition.y

		// Obtenemos las dimensiones reales del elemento de la firma
		const signatureWidth = 200
		const signatureHeight = nodeRef.current?.offsetHeight || 0

		const dataForBackend = {
			signatureBase64: sigImage,
			pageIndex: currentPage - 1,
			coordX: Math.round(finalPosition.x),
			coordY: Math.round(relativeY),
			viewportWidth: Math.round(pageWidth),
			viewportHeight: Math.round(currentPageHeight),
			signatureWidth: signatureWidth,
			signatureHeight: signatureHeight,
			totalDocumentPages: numPages,
		}

		console.log('--- DATOS LISTOS PARA EL BACKEND (C#) ---', dataForBackend)

		alert(`
			DATOS PARA EL BACKEND (DevExpress):
			- Página Actual: ${currentPage} (Índice: ${dataForBackend.pageIndex})
			- Coord X/Y: ${dataForBackend.coordX}, ${dataForBackend.coordY} px
			- Tamaño Firma: ${dataForBackend.signatureWidth}x${dataForBackend.signatureHeight} px
			- Tamaño Viewport Página: ${dataForBackend.viewportWidth}x${dataForBackend.viewportHeight} px
		`)
	}

	const goToPrevPage = () => {
		setCurrentPage((prev) => Math.max(prev - 1, 1))
		setFinalPosition({ x: 0, y: 0 }) // Reset posición al cambiar página
	}

	const goToNextPage = () => {
		setCurrentPage((prev) => Math.min(prev + 1, numPages))
		setFinalPosition({ x: 0, y: 0 }) // Reset posición al cambiar página
	}

	return (
		<div className='flex flex-col items-center min-h-screen bg-slate-100 p-4 md:p-8 font-sans text-slate-900'>
			<header className='text-center mb-10'>
				<h1 className='text-4xl font-black text-indigo-900 tracking-tighter uppercase'>
					Demo Signature
				</h1>
			</header>

			<main className='w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8'>
				{/* PANEL DE CONFIGURACIÓN */}
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
								GUARDAR
							</button>
							<button
								type='button'
								onClick={clearSignature}
								className='bg-slate-100 text-slate-500 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-colors'
							>
								LIMPIAR
							</button>
						</div>

						{sigImage && (
							<div className='p-6 bg-slate-900 rounded-3xl text-white space-y-4 shadow-2xl overflow-hidden'>
								<div className='flex justify-between items-center'>
									<p className='text-[10px] font-black text-indigo-400 uppercase tracking-widest'>
										Coordenadas Reales
									</p>
									<span className='w-2 h-2 bg-green-500 rounded-full animate-pulse' />
								</div>
								<div className='grid grid-cols-2 gap-3 font-mono'>
									<div className='bg-white/5 p-3 rounded-xl border border-white/10'>
										<span className='block text-[9px] text-slate-400 mb-1 italic'>
											X (PTS)
										</span>
										<span className='text-lg font-bold'>
											{Math.round(finalPosition.x)}
										</span>
									</div>
									<div className='bg-white/5 p-3 rounded-xl border border-white/10'>
										<span className='block text-[9px] text-slate-400 mb-1 italic'>
											Y (REL)
										</span>
										<span className='text-lg font-bold'>
											{Math.round(finalPosition.y)}
										</span>
									</div>
								</div>
							</div>
						)}
					</div>
				</aside>

				{/* VISOR DE DOCUMENTO */}
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
										className='p-1.5 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors'
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
									<span className='text-xs font-black text-slate-600 min-w-16 text-center tabular-nums'>
										{currentPage} / {numPages || '--'}
									</span>
									<button
										type='button'
										onClick={goToNextPage}
										disabled={currentPage === numPages}
										className='p-1.5 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors'
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
							<span className='hidden md:inline-block px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100'>
								Pág. Actual: {currentPage}
							</span>
						</div>

						{/* AREA DE VISUALIZACIÓN */}
						<div className='relative'>
							<div
								className='w-full bg-slate-200 overflow-y-auto overflow-x-hidden border-12 border-white'
								style={{ maxHeight: '750px' }}
							>
								<div
									className='relative mx-auto bg-white shadow-lg'
									style={{ width: pageWidth > 0 ? pageWidth : '100%' }}
								>
									<Document
										file={pdfUrl}
										onLoadSuccess={onDocumentLoadSuccess}
										loading={
											<div className='p-20 text-slate-400 font-bold text-center italic'>
												Cargando PDF...
											</div>
										}
									>
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
											<div className='absolute bottom-4 right-4 bg-slate-900/10 px-3 py-1 rounded-full text-[10px] font-black text-slate-500 pointer-events-none'>
												PÁG. {currentPage}
											</div>
										</div>
									</Document>

									{sigImage && (
										<Draggable
											nodeRef={nodeRef}
											bounds='parent'
											onStop={(_e, data) => {
												setFinalPosition({ x: data.x, y: data.y })
											}}
										>
											<div
												ref={nodeRef}
												className='absolute top-0 left-0 z-50 cursor-grab active:cursor-grabbing'
												style={{ width: '200px' }}
											>
												<div className='relative group'>
													<img
														src={sigImage}
														className='w-full bg-white/50 border-2 border-dashed border-indigo-500 p-1 rounded-lg transition-all group-hover:bg-white group-hover:shadow-2xl'
														alt='Firma'
														draggable={false}
													/>
												</div>
											</div>
										</Draggable>
									)}
								</div>
							</div>

							{/* OVERLAY BLOQUEADOR */}
							{!sigImage && (
								<div className='absolute inset-0 bg-slate-900/10 backdrop-blur-[3px] z-100 flex items-center justify-center p-8'>
									<div className='bg-white/90 px-10 py-6 rounded-4xl shadow-2xl border border-indigo-100 flex flex-col items-center gap-3'>
										<div className='w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-2'>
											<svg
												className='w-6 h-6 text-indigo-600'
												fill='none'
												stroke='currentColor'
												viewBox='0 0 24 24'
											>
												<title id='svg-title'>
													Overlay para bloquear contenido
												</title>
												<path
													strokeLinecap='round'
													strokeLinejoin='round'
													strokeWidth='2'
													d='M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z'
												/>
											</svg>
										</div>
										<p className='text-slate-800 font-black text-center text-sm uppercase tracking-widest'>
											Acción Requerida
										</p>
										<p className='text-xs text-slate-500 text-center max-w-50 leading-relaxed'>
											Por favor, crea tu firma en el panel de la izquierda para
											habilitar la edición del documento.
										</p>
									</div>
								</div>
							)}
						</div>

						<div className='p-8 flex flex-col md:flex-row justify-end items-center gap-6 bg-slate-50 border-t border-slate-100'>
							<button
								type='button'
								onClick={handleFinalConfirm}
								disabled={!sigImage}
								className={`w-full md:w-auto px-12 py-5 rounded-2xl font-black text-lg transition-all transform shadow-2xl ${
									sigImage
										? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-1 shadow-indigo-200'
										: 'bg-slate-200 text-slate-300 cursor-not-allowed shadow-none'
								}`}
							>
								FINALIZAR DOCUMENTO
							</button>
						</div>
					</div>
				</section>
			</main>
		</div>
	)
}
