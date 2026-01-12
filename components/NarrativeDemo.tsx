'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

export default function NarrativeDemo() {
  const [scene, setScene] = useState(0);
  const prefersReducedMotion = useReducedMotion() ?? false;
  const duration = prefersReducedMotion ? 0.3 : 0.6;
  const delay = prefersReducedMotion ? 0.1 : 0.3;

  useEffect(() => {
    // Always start the animation, even with reduced motion (just faster)
    const interval = setInterval(() => {
      setScene((prev) => {
        const next = (prev + 1) % 4;
        return next;
      });
    }, prefersReducedMotion ? 2000 : 3200);

    return () => clearInterval(interval);
  }, [prefersReducedMotion]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        duration: duration * 0.5,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: duration,
        ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
      },
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: {
        duration: duration * 0.8,
        ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
      },
    },
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '1000px',
        margin: '0 auto',
        padding: 'var(--spacing-2xl) var(--spacing-lg)',
        minHeight: '550px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          position: 'relative',
        }}
      >
        <AnimatePresence mode="wait">
          {/* Scene 1: Input */}
          {scene === 0 && (
            <motion.div
              key="input"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{
                background: 'var(--color-background-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--spacing-xl)',
                minHeight: '450px',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-lg)',
              }}
            >
              <motion.div
                variants={itemVariants}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--color-text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 500,
                  }}
                >
                  Input
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: delay * 0.5, duration: duration }}
                  style={{
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid var(--color-primary)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--spacing-xs) var(--spacing-sm)',
                    fontSize: '0.75rem',
                    color: 'var(--color-primary)',
                    fontWeight: 500,
                  }}
                >
                  Article URL
                </motion.div>
              </motion.div>
              <motion.div
                variants={itemVariants}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--spacing-lg)',
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: duration,
                    delay: delay * 1.5,
                    ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
                  }}
                  style={{
                    width: '100%',
                    maxWidth: '600px',
                    background: 'var(--color-background-tertiary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--spacing-md) var(--spacing-lg)',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    color: 'var(--color-text-secondary)',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-sm)',
                  }}
                >
                  <motion.span
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{
                      duration: 1.2,
                      delay: delay * 2,
                      ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
                    }}
                    style={{
                      display: 'inline-block',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}
                  >
                    https://foreignnews.com/article
                  </motion.span>
                  <motion.span
                    initial={{ opacity: 1 }}
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: delay * 3.2,
                    }}
                    style={{
                      display: 'inline-block',
                      width: '2px',
                      height: '1em',
                      background: 'var(--color-primary)',
                      verticalAlign: 'baseline',
                    }}
                  />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: delay * 3.5, duration: duration }}
                  style={{
                    display: 'flex',
                    gap: 'var(--spacing-sm)',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                  }}
                >
                  {['Extracting content...', 'Detecting language...'].map((text, idx) => (
                    <motion.div
                      key={text}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: delay * (3.5 + idx * 0.3), duration: duration * 0.5 }}
                      style={{
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid var(--color-success)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--spacing-xs) var(--spacing-sm)',
                        fontSize: '0.75rem',
                        color: 'var(--color-success)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-xs)',
                      }}
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        style={{
                          width: '8px',
                          height: '8px',
                          border: '2px solid var(--color-success)',
                          borderTopColor: 'transparent',
                          borderRadius: '50%',
                        }}
                      />
                      {text}
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            </motion.div>
          )}

          {/* Scene 2: Processing */}
          {scene === 1 && (
            <motion.div
              key="processing"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{
                background: 'var(--color-background-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--spacing-xl)',
                minHeight: '450px',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-lg)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <motion.div
                variants={itemVariants}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--color-text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 500,
                  }}
                >
                  AI Processing
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: delay * 0.5, duration: duration }}
                  style={{
                    background: 'rgba(139, 92, 246, 0.1)',
                    border: '1px solid var(--color-secondary)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--spacing-xs) var(--spacing-sm)',
                    fontSize: '0.75rem',
                    color: 'var(--color-secondary)',
                    fontWeight: 500,
                  }}
                >
                  GPT-4o-mini
                </motion.div>
              </motion.div>
              <motion.div
                variants={itemVariants}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-md)',
                }}
              >
                {[
                  { label: 'Identifying key ideas', status: 'complete', color: 'var(--color-success)' },
                  { label: 'Understanding context', status: 'complete', color: 'var(--color-success)' },
                  { label: 'Linking concepts', status: 'processing', color: 'var(--color-primary)' },
                  { label: 'Extracting assumptions', status: 'pending', color: 'var(--color-text-tertiary)' },
                ].map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{
                      duration: duration,
                      delay: delay * index * 0.5,
                      ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-md)',
                      padding: 'var(--spacing-md)',
                      background: 'var(--color-background-tertiary)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <motion.div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: item.status === 'complete' ? item.color : 'transparent',
                        border: `2px solid ${item.color}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {item.status === 'complete' && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: 'white',
                          }}
                        />
                      )}
                      {item.status === 'processing' && (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          style={{
                            width: '6px',
                            height: '6px',
                            border: '2px solid',
                            borderColor: item.color,
                            borderTopColor: 'transparent',
                            borderRadius: '50%',
                          }}
                        />
                      )}
                    </motion.div>
                    <div
                      style={{
                        flex: 1,
                        fontSize: '0.9375rem',
                        color: 'var(--color-text-primary)',
                        fontWeight: 400,
                      }}
                    >
                      {item.label}…
                    </div>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: delay * index * 0.5 + 0.2 }}
                      style={{
                        background: `${item.color}15`,
                        border: `1px solid ${item.color}`,
                        borderRadius: 'var(--radius-sm)',
                        padding: 'var(--spacing-xs) var(--spacing-sm)',
                        fontSize: '0.75rem',
                        color: item.color,
                        fontWeight: 500,
                        textTransform: 'uppercase',
                      }}
                    >
                      {item.status}
                    </motion.div>
                  </motion.div>
                ))}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: delay * 2.5, duration: duration }}
                  style={{
                    marginTop: 'var(--spacing-md)',
                    padding: 'var(--spacing-md)',
                    background: 'rgba(99, 102, 241, 0.05)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <div style={{ color: 'var(--color-primary)', marginBottom: 'var(--spacing-xs)' }}>
                    POST /api/process-article-stream
                  </div>
                  <div style={{ color: 'var(--color-success)' }}>HTTP 200: Processing...</div>
                </motion.div>
              </motion.div>
            </motion.div>
          )}

          {/* Scene 3: Output */}
          {scene === 2 && (
            <motion.div
              key="output"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{
                background: 'var(--color-background-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--spacing-xl)',
                minHeight: '450px',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-lg)',
              }}
            >
              <motion.div
                variants={itemVariants}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--color-text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 500,
                  }}
                >
                  Re-expressed Insights
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: delay * 0.5, duration: duration }}
                  style={{
                    display: 'flex',
                    gap: 'var(--spacing-xs)',
                  }}
                >
                  <div
                    style={{
                      background: 'rgba(236, 72, 153, 0.1)',
                      border: '1px solid var(--color-accent)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--spacing-xs) var(--spacing-sm)',
                      fontSize: '0.75rem',
                      color: 'var(--color-accent)',
                      fontWeight: 500,
                    }}
                  >
                    zh-CN
                  </div>
                  <div
                    style={{
                      background: 'rgba(99, 102, 241, 0.1)',
                      border: '1px solid var(--color-primary)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--spacing-xs) var(--spacing-sm)',
                      fontSize: '0.75rem',
                      color: 'var(--color-primary)',
                      fontWeight: 500,
                    }}
                  >
                    Medium
                  </div>
                </motion.div>
              </motion.div>
              <motion.div
                variants={itemVariants}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-md)',
                  overflowY: 'auto',
                }}
              >
                {[
                  { type: 'heading', text: '核心观点', badge: 'Key Ideas' },
                  { type: 'paragraph', text: '这篇文章探讨了跨文化沟通中的关键挑战，强调了理解深层含义而非表面文字的重要性。' },
                  { type: 'paragraph', text: '作者指出，真正的交流需要超越语言障碍，关注思想、假设和隐含意义。' },
                  { type: 'heading', text: '关键洞察', badge: 'Insights' },
                  { type: 'list', items: ['语境决定理解', '文化背景影响解读', '深层含义需要主动挖掘'] },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: duration,
                      delay: delay * index * 0.3 + 0.2,
                      ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
                    }}
                    style={{
                      fontSize: item.type === 'heading' ? '1.25rem' : '0.9375rem',
                      color: item.type === 'heading' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                      fontWeight: item.type === 'heading' ? 600 : 400,
                      lineHeight: 1.6,
                    }}
                  >
                    {item.type === 'heading' && item.badge && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: delay * index * 0.3 + 0.3 }}
                        style={{
                          display: 'inline-block',
                          marginRight: 'var(--spacing-sm)',
                          background: 'rgba(16, 185, 129, 0.1)',
                          border: '1px solid var(--color-success)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '2px 6px',
                          fontSize: '0.7rem',
                          color: 'var(--color-success)',
                          fontWeight: 500,
                          verticalAlign: 'middle',
                        }}
                      >
                        {item.badge}
                      </motion.span>
                    )}
                    {item.type === 'list' ? (
                      <ul style={{ marginLeft: 'var(--spacing-lg)', paddingLeft: 0, listStyle: 'none' }}>        
                        {item.items?.map((listItem, listIndex) => (
                          <motion.li
                            key={listIndex}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: delay * (index + listIndex * 0.2) * 0.3 + 0.4 }}
                            style={{
                              marginBottom: 'var(--spacing-xs)',
                              position: 'relative',
                              paddingLeft: 'var(--spacing-md)',
                            }}
                          >
                            <span
                              style={{
                                position: 'absolute',
                                left: 0,
                                color: 'var(--color-primary)',
                                fontSize: '1.2rem',
                              }}
                            >
                              •
                            </span>
                            {listItem}
                          </motion.li>
                        ))}
                      </ul>
                    ) : (
                      item.text
                    )}
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* Scene 4: Control */}
          {scene === 3 && (
            <motion.div
              key="control"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{
                background: 'var(--color-background-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--spacing-xl)',
                minHeight: '450px',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-lg)',
              }}
            >
              <motion.div
                variants={itemVariants}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--color-text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 500,
                  }}
                >
                  Your Control
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: delay * 0.5, duration: duration }}
                  style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid var(--color-success)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--spacing-xs) var(--spacing-sm)',
                    fontSize: '0.75rem',
                    color: 'var(--color-success)',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-xs)',
                  }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: 'var(--color-success)',
                    }}
                  />
                  Active
                </motion.div>
              </motion.div>
              <motion.div
                variants={itemVariants}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--spacing-lg)',
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: duration,
                    delay: delay,
                    ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
                  }}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 'var(--spacing-sm)',
                    justifyContent: 'center',
                    width: '100%',
                  }}
                >
                  {[
                    { label: 'Education', color: 'var(--color-primary)', icon: '📚' },
                    { label: 'Medium restructure', color: 'var(--color-secondary)', icon: '🔄' },
                    { label: 'Simplified Chinese', color: 'var(--color-accent)', icon: '🌐' },
                  ].map((chip, index) => (
                    <motion.div
                      key={chip.label}
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        duration: duration,
                        delay: delay * (index + 1) * 0.4 + 0.3,
                        ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
                      }}
                      style={{
                        background: `${chip.color}15`,
                        border: `1px solid ${chip.color}`,
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--spacing-sm) var(--spacing-md)',
                        fontSize: '0.875rem',
                        color: chip.color,
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-xs)',
                      }}
                    >
                      <span>{chip.icon}</span>
                      {chip.label}
                    </motion.div>
                  ))}
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: duration,
                    delay: delay * 2.5,
                    ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
                  }}
                  style={{
                    fontSize: '1.125rem',
                    color: 'var(--color-text-primary)',
                    fontWeight: 400,
                    textAlign: 'center',
                    marginTop: 'var(--spacing-md)',
                  }}
                >
                  Same ideas. Your way.
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: duration,
                    delay: delay * 3,
                    ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
                  }}
                  style={{
                    display: 'flex',
                    gap: 'var(--spacing-sm)',
                    marginTop: 'var(--spacing-md)',
                  }}
                >
                  {['Download', 'Play Audio', 'Share'].map((action, idx) => (
                    <motion.div
                      key={action}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: delay * 3 + idx * 0.2, duration: duration * 0.5 }}
                      whileHover={{ scale: 1.05 }}
                      style={{
                        background: 'var(--color-background-tertiary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--spacing-xs) var(--spacing-sm)',
                        fontSize: '0.75rem',
                        color: 'var(--color-text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      {action}
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
