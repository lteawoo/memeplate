import React from 'react';
import Icon from '@mdi/react';
import { mdiCommentOutline, mdiDownload, mdiEyeOutline, mdiHeartOutline, mdiLinkVariant, mdiShareVariant } from '@mdi/js';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { formatDateLabel, formatDateTimeLabel } from '@/lib/dateFormat';
import { formatImageFormatLabel } from '@/lib/imageFormat';
import MainHeader from '../components/layout/MainHeader';
import MainFooter from '../components/layout/MainFooter';
import PageContainer from '../components/layout/PageContainer';
import PreviewFrame from '../components/PreviewFrame';
import ThumbnailCard from '../components/ThumbnailCard';
import { IMAGE_DETAIL_LIMITS, formatBytes, useImageShareDetail } from '../features/remix-detail/hooks/useImageShareDetail';

const SidebarThumbnailSkeleton: React.FC = () => (
  <div className="overflow-hidden rounded-xl border border-transparent bg-transparent shadow-none">
    <div className="thumb-card-surface h-52 w-full bg-transparent px-4">
      <div className="thumb-card-media-surface relative flex h-full items-center justify-center overflow-hidden rounded-lg bg-transparent">
        <Skeleton className="absolute inset-0 rounded-lg bg-border/70" />
      </div>
    </div>
    <div className="space-y-2 px-4 pt-3 pb-4">
      <Skeleton className="h-4 w-full rounded bg-border/80" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 flex-1 rounded bg-border/70" />
        <Skeleton className="h-4 flex-1 rounded bg-border/70" />
      </div>
    </div>
  </div>
);

const ImageShareDetailPage: React.FC = () => {
  const {
    image,
    isMainImageLoaded,
    isMainImageError,
    mainImageRef,
    isLoading,
    error,
    editTitle,
    setEditTitle,
    editDescription,
    setEditDescription,
    isEditDialogOpen,
    setIsEditDialogOpen,
    isSavingMeta,
    isLikingImage,
    likedImageByMe,
    sourceTemplate,
    isRelatedLoading,
    isRelatedLoaded,
    relatedError,
    visibleRelatedRemixes,
    comments,
    threadedComments,
    commentDraft,
    setCommentDraft,
    activeReplyTarget,
    replyDraft,
    setReplyDraft,
    isSubmittingComment,
    isSubmittingReply,
    commentsSectionRef,
    isOwner,
    displayCommentCount,
    handleLikeImage,
    handleScrollToComments,
    handleDownloadRemixImage,
    handleCopyRemixLink,
    handleOpenSourceTemplate,
    handleStartRemixFromSource,
    handleSubmitComment,
    handleSubmitInlineReply,
    handleStartReply,
    handleCancelReply,
    handleOpenEditDialog,
    handleSaveMetaFromDialog,
    handleEditDialogOpenChange,
    handleMainImageLoad,
    handleMainImageError,
    openRelatedRemix,
  } = useImageShareDetail();

  const commentBodyMaxLength = IMAGE_DETAIL_LIMITS.commentBodyMaxLength;

  const renderInlineReplyComposer = (targetCommentId: string) => {
    if (activeReplyTarget?.commentId !== targetCommentId) return null;

    return (
      <div className="mt-3 space-y-2 rounded-md border border-border/70 bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground">
          {activeReplyTarget.authorName}님에게 답글
        </p>
        <Textarea
          value={replyDraft}
          maxLength={commentBodyMaxLength}
          rows={3}
          className="border border-border bg-background"
          onChange={(event) => setReplyDraft(event.target.value)}
          placeholder="답글을 입력해 주세요."
          disabled={isSubmittingReply}
        />
        <div className="flex items-center justify-end gap-2">
          <span className="text-xs text-muted-foreground">
            {replyDraft.trim().length}/{commentBodyMaxLength}
          </span>
          <Button type="button" size="sm" variant="ghost" disabled={isSubmittingReply} onClick={handleCancelReply}>
            취소
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isSubmittingReply}
            onClick={() => { void handleSubmitInlineReply(); }}
          >
            {isSubmittingReply ? '등록 중...' : '등록'}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-app-surface">
      <MainHeader />
      <PageContainer className="pt-6 pb-10">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
            <aside className="order-2 rounded-2xl bg-card p-6 lg:order-1 lg:self-start">
              <Skeleton className="mb-3 h-5 w-28 rounded bg-border/70" />
              <div className="mb-3">
                <SidebarThumbnailSkeleton />
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2">
                <Skeleton className="h-9 rounded bg-border/70" />
              </div>
              <Skeleton className="mt-8 mb-3 h-5 w-24 rounded bg-border/70" />
              <div className="space-y-3">
                {Array.from({ length: 2 }, (_, idx) => (
                  <SidebarThumbnailSkeleton key={idx} />
                ))}
              </div>
            </aside>
            <div className="order-1 rounded-2xl bg-card p-6 lg:order-2">
              <section className="mb-3">
                <Skeleton className="mb-2 h-8 w-3/5 rounded bg-border/80" />
                <Skeleton className="h-4 w-32 rounded bg-border/70" />
              </section>
              <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
                <PreviewFrame alt="공유 이미지 로딩" loadingPlaceholder contentClassName="h-[480px] p-0" />
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-24 rounded bg-border/70" />
                    <Skeleton className="h-9 w-24 rounded bg-border/70" />
                  </div>
                  <Skeleton className="h-4 w-4/5 rounded bg-border/70" />
                  <div className="space-y-3">
                    {Array.from({ length: 6 }, (_, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3">
                        <Skeleton className="h-4 w-16 rounded bg-border/70" />
                        <Skeleton className="h-4 w-28 rounded bg-border/70" />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
              <section className="mt-8 border-t border-border/70 pt-6">
                <Skeleton className="mb-4 h-6 w-20 rounded bg-border/70" />
                <Skeleton className="mb-2 h-24 w-full rounded bg-border/70" />
                <Skeleton className="h-9 w-20 rounded bg-border/70" />
              </section>
            </div>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTitle>이미지 로딩 실패</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : image ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
            <aside className="order-2 rounded-2xl bg-card p-6 lg:order-1 lg:self-start">
              <section>
                <h3 className="mb-3 text-base font-semibold text-foreground">밈플릿</h3>
                {sourceTemplate ? (
                  <div className="space-y-3">
                    <ThumbnailCard
                      imageUrl={sourceTemplate.thumbnailUrl}
                      title={sourceTemplate.title}
                      hoverable
                      hoverSurfaceOnly
                      fallbackText="원본 이미지 없음"
                      onClick={handleOpenSourceTemplate}
                    >
                      <div className="space-y-1">
                        <h4 className="line-clamp-1 text-sm font-semibold text-foreground">{sourceTemplate.title}</h4>
                        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span className="truncate">{sourceTemplate.ownerDisplayName || sourceTemplate.ownerId}</span>
                          <span className="inline-flex shrink-0 items-center gap-2">
                            <span className="inline-flex items-center gap-1">
                              <Icon path={mdiEyeOutline} size={0.55} />
                              {(sourceTemplate.viewCount ?? 0).toLocaleString()}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Icon path={mdiHeartOutline} size={0.55} />
                              {(sourceTemplate.likeCount ?? 0).toLocaleString()}
                            </span>
                          </span>
                        </div>
                      </div>
                    </ThumbnailCard>
                    <div className="grid grid-cols-1 gap-2">
                      <Button
                        type="button"
                        className="h-9"
                        onClick={() => { void handleStartRemixFromSource(); }}
                      >
                        리믹스
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    밈플릿 정보를 찾을 수 없습니다.
                  </div>
                )}
              </section>

              <section className="mt-8">
                <div className="mb-3">
                  <h3 className="text-base font-semibold text-foreground">다른 리믹스</h3>
                </div>
                {isRelatedLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 2 }, (_, idx) => (
                      <SidebarThumbnailSkeleton key={idx} />
                    ))}
                  </div>
                ) : relatedError ? (
                  <Alert variant="destructive">
                    <AlertTitle>목록 로딩 실패</AlertTitle>
                    <AlertDescription>{relatedError}</AlertDescription>
                  </Alert>
                ) : isRelatedLoaded && visibleRelatedRemixes.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    아직 다른 리믹스가 없습니다.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {visibleRelatedRemixes.map((candidate) => (
                      <ThumbnailCard
                        key={candidate.id}
                        imageUrl={candidate.imageUrl}
                        title={candidate.title}
                        hoverable
                        hoverSurfaceOnly
                        onClick={() => openRelatedRemix(candidate.shareSlug)}
                      >
                        <div className="space-y-1">
                          <h4 className="line-clamp-1 text-sm font-semibold text-foreground">{candidate.title}</h4>
                          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                            <span className="truncate">{candidate.ownerDisplayName || candidate.ownerId || '-'}</span>
                            <span className="inline-flex shrink-0 items-center gap-2">
                              <span className="inline-flex items-center gap-1">
                                <Icon path={mdiEyeOutline} size={0.55} />
                                {(candidate.viewCount ?? 0).toLocaleString()}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Icon path={mdiHeartOutline} size={0.55} />
                                {(candidate.likeCount ?? 0).toLocaleString()}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Icon path={mdiCommentOutline} size={0.55} />
                                {(candidate.commentCount ?? 0).toLocaleString()}
                              </span>
                            </span>
                          </div>
                        </div>
                      </ThumbnailCard>
                    ))}
                  </div>
                )}
              </section>
            </aside>

            <div className="order-1 rounded-2xl bg-card p-6 lg:order-2">
              <section className="mb-3">
                <h2 className="mb-1 text-3xl font-bold text-foreground">{image.title}</h2>
                <p className="text-sm text-muted-foreground">{image.ownerDisplayName || image.ownerId || '-'}</p>
              </section>
              <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
                <PreviewFrame
                  imageUrl={image.imageUrl}
                  alt={image.title}
                  imageRef={mainImageRef}
                  imageKey={image.imageUrl}
                  isImageLoaded={isMainImageLoaded}
                  isImageError={isMainImageError}
                  contentClassName="p-0"
                  maxImageHeightClassName="max-h-[800px] max-w-[800px]"
                  onLoad={handleMainImageLoad}
                  onError={handleMainImageError}
                />

                <div className="space-y-6">
                  {image.description ? (
                    <div className="whitespace-pre-wrap text-sm text-muted-foreground">{image.description}</div>
                  ) : null}
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-muted-foreground">생성일</span>
                      <span className="text-right font-medium text-foreground">
                        {formatDateLabel(image.createdDate ?? image.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-muted-foreground">이미지 포맷</span>
                      <span className="text-right font-medium text-foreground">
                        {formatImageFormatLabel(image.imageMime, image.imageUrl)}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-muted-foreground">해상도</span>
                      <span className="text-right font-medium text-foreground">
                        {image.imageWidth && image.imageHeight ? `${image.imageWidth} x ${image.imageHeight}` : '-'}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-muted-foreground">파일 사이즈</span>
                      <span className="text-right font-medium text-foreground">{formatBytes(image.imageBytes ?? 0)}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-muted-foreground">조회수</span>
                      <span className="text-right font-medium text-foreground">{(image.viewCount ?? 0).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className={`gap-1.5 ${likedImageByMe ? 'border-primary bg-primary/15 text-primary' : ''}`}
                      onClick={() => { void handleLikeImage(); }}
                      disabled={isLikingImage || image.visibility !== 'public'}
                      aria-label="좋아요"
                      aria-pressed={likedImageByMe}
                    >
                      <Icon path={mdiHeartOutline} size={0.75} />
                      {(image.likeCount ?? 0).toLocaleString()}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-1.5"
                      onClick={handleScrollToComments}
                      aria-label="댓글 영역으로 이동"
                    >
                      <Icon path={mdiCommentOutline} size={0.75} />
                      {displayCommentCount.toLocaleString()}
                    </Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" className="gap-1.5" aria-label="공유">
                          <Icon path={mdiShareVariant} size={0.75} />
                          공유
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-44 p-2">
                        <div className="grid gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-9 justify-start gap-2"
                            onClick={() => { void handleDownloadRemixImage(); }}
                          >
                            <Icon path={mdiDownload} size={0.75} />
                            다운로드
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-9 justify-start gap-2"
                            onClick={() => { void handleCopyRemixLink(); }}
                          >
                            <Icon path={mdiLinkVariant} size={0.75} />
                            링크 복사
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                    {isOwner ? (
                      <Button type="button" variant="outline" onClick={handleOpenEditDialog}>수정</Button>
                    ) : null}
                  </div>
                </div>
              </section>

              {isOwner ? (
                <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogOpenChange}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>리믹스 정보 수정</DialogTitle>
                      <DialogDescription>제목과 설명을 수정합니다.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="remix-title">제목</Label>
                        <Input
                          id="remix-title"
                          value={editTitle}
                          maxLength={100}
                          onChange={(event) => setEditTitle(event.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="remix-description">설명</Label>
                        <Textarea
                          id="remix-description"
                          value={editDescription}
                          maxLength={500}
                          rows={4}
                          onChange={(event) => setEditDescription(event.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSavingMeta}
                        onClick={() => setIsEditDialogOpen(false)}
                      >
                        취소
                      </Button>
                      <Button
                        type="button"
                        disabled={isSavingMeta}
                        onClick={() => { void handleSaveMetaFromDialog(); }}
                      >
                        {isSavingMeta ? '저장 중...' : '저장'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              ) : null}

              <section ref={commentsSectionRef} id="remix-comments" className="mt-8 border-t border-border/70 pt-6">
                <h3 className="mb-4 text-lg font-semibold text-foreground">
                  댓글({displayCommentCount.toLocaleString()})
                </h3>
                <div className="space-y-2">
                  <Textarea
                    value={commentDraft}
                    maxLength={commentBodyMaxLength}
                    rows={3}
                    className="border border-border bg-background"
                    onChange={(event) => setCommentDraft(event.target.value)}
                    placeholder="의견을 입력해 주세요."
                    disabled={isSubmittingComment || isSubmittingReply}
                  />
                  <div className="flex items-center justify-end gap-3">
                    <span className="text-xs text-muted-foreground">
                      {commentDraft.trim().length}/{commentBodyMaxLength}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      disabled={isSubmittingComment || isSubmittingReply}
                      onClick={() => { void handleSubmitComment(); }}
                    >
                      {isSubmittingComment ? '등록 중...' : '등록'}
                    </Button>
                  </div>
                </div>
                <div className="mt-5">
                  {comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                      <Icon path={mdiCommentOutline} size={1.2} className="text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">아직 댓글이 없습니다.</p>
                      <p className="text-xs text-muted-foreground">첫 댓글을 남겨보세요.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/70 border-y border-border/70">
                      {threadedComments.topLevel.map((comment) => {
                        const authorName = comment.authorDisplayName || comment.authorId || '익명';
                        const replies = threadedComments.repliesByRoot.get(comment.id) ?? [];

                        return (
                          <article key={comment.id} className="py-4">
                            <div className="min-w-0">
                              <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="text-sm font-semibold text-foreground">{authorName}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDateTimeLabel(comment.createdAt)}
                                </span>
                              </div>
                              <p className="whitespace-pre-wrap text-sm text-foreground">{comment.body}</p>
                              <div className="mt-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                  onClick={() => handleStartReply(comment)}
                                >
                                  답글
                                </Button>
                              </div>
                              {renderInlineReplyComposer(comment.id)}

                              {replies.length > 0 ? (
                                <div className="mt-3 space-y-3 border-l border-border/70 pl-3">
                                  {replies.map((reply) => {
                                    const replyAuthorName = reply.authorDisplayName || reply.authorId || '익명';
                                    return (
                                      <div key={reply.id} className="min-w-0">
                                        <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                          <span className="text-sm font-medium text-foreground">{replyAuthorName}</span>
                                          <span className="text-xs text-muted-foreground">
                                            {formatDateTimeLabel(reply.createdAt)}
                                          </span>
                                        </div>
                                        {reply.replyToAuthorDisplayName ? (
                                          <p className="mb-1 text-xs text-muted-foreground">
                                            {reply.replyToAuthorDisplayName}님에게 답글
                                          </p>
                                        ) : null}
                                        <p className="whitespace-pre-wrap text-sm text-foreground">{reply.body}</p>
                                        <div className="mt-1">
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                            onClick={() => handleStartReply(reply)}
                                          >
                                            답글
                                          </Button>
                                        </div>
                                        {renderInlineReplyComposer(reply.id)}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </div>
                          </article>
                        );
                      })}
                      {threadedComments.orphanReplies.map((reply) => {
                        const replyAuthorName = reply.authorDisplayName || reply.authorId || '익명';
                        return (
                          <article key={reply.id} className="py-4">
                            <div className="min-w-0 border-l border-border/70 pl-3">
                              <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="text-sm font-medium text-foreground">{replyAuthorName}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDateTimeLabel(reply.createdAt)}
                                </span>
                              </div>
                              {reply.replyToAuthorDisplayName ? (
                                <p className="mb-1 text-xs text-muted-foreground">
                                  {reply.replyToAuthorDisplayName}님에게 답글
                                </p>
                              ) : null}
                              <p className="whitespace-pre-wrap text-sm text-foreground">{reply.body}</p>
                              <div className="mt-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                  onClick={() => handleStartReply(reply)}
                                >
                                  답글
                                </Button>
                              </div>
                              {renderInlineReplyComposer(reply.id)}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        ) : null}
      </PageContainer>
      <MainFooter />
    </div>
  );
};

export default ImageShareDetailPage;
