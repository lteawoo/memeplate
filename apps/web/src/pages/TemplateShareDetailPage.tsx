import React from 'react';
import Icon from '@mdi/react';
import {
  mdiCommentOutline,
  mdiDownload,
  mdiEyeOutline,
  mdiHeartOutline,
  mdiImageOffOutline,
  mdiLinkVariant,
  mdiShareVariant,
  mdiThumbUpOutline
} from '@mdi/js';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDateLabel } from '@/lib/dateFormat';
import MainHeader from '../components/layout/MainHeader';
import MainFooter from '../components/layout/MainFooter';
import PageContainer from '../components/layout/PageContainer';
import TemplateCardSkeletonGrid from '../components/TemplateCardSkeletonGrid';
import PreviewFrame from '../components/PreviewFrame';
import type { TemplateVisibility } from '../types/template';
import ThumbnailCard from '../components/ThumbnailCard';
import { useTemplateShareDetail } from '../features/template-detail/hooks/useTemplateShareDetail';

const DETAIL_RELATED_SKELETON_COUNT = 2;

type SegmentedOption = {
  label: React.ReactNode;
  value: TemplateVisibility;
};

interface SegmentedButtonsProps {
  value: TemplateVisibility;
  options: SegmentedOption[];
  onChange: (value: TemplateVisibility) => void;
  disabled?: boolean;
}

const SegmentedButtons: React.FC<SegmentedButtonsProps> = ({ value, options, onChange, disabled }) => (
  <div className="grid w-full grid-cols-2 gap-2 rounded-xl bg-app-surface p-2">
    {options.map((option) => {
      const active = option.value === value;
      return (
        <Button
          key={option.value}
          type="button"
          variant={active ? 'default' : 'ghost'}
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className="h-10 rounded-lg text-sm font-semibold"
        >
          {option.label}
        </Button>
      );
    })}
  </div>
);

const TemplateShareDetailPage: React.FC = () => {
  const {
    template,
    imageMeta,
    relatedImages,
    sortedRelatedImages,
    relatedSort,
    setRelatedSort,
    isRelatedLoading,
    relatedError,
    isRelatedLoaded,
    isMainImageLoaded,
    isMainImageError,
    mainImageRef,
    handleMainImageLoad,
    handleMainImageError,
    isLoading,
    error,
    isUpdatingVisibility,
    isDeletingTemplate,
    isSavingMeta,
    isLikingTemplate,
    likedTemplateByMe,
    isManageDialogOpen,
    setIsManageDialogOpen,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    editTitle,
    setEditTitle,
    editDescription,
    setEditDescription,
    isOwner,
    isPrivateSwitchHidden,
    isDeleteHidden,
    handleRemixClick,
    handleLikeTemplate,
    handleDownloadTemplateImage,
    handleCopyTemplateLink,
    handleChangeVisibility,
    handleDeleteTemplate,
    handleOpenManageDialog,
    handleManageDialogOpenChange,
    handleSaveMetaFromDialog,
    openRelatedRemix,
  } = useTemplateShareDetail();

  return (
    <div className="min-h-screen bg-app-surface">
      <MainHeader />
      <PageContainer className="pt-6 pb-10">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
            <div className="rounded-2xl bg-card p-6">
              <div className="mb-4 space-y-2">
                <Skeleton className="h-5 w-full rounded bg-border/80" />
                <Skeleton className="h-4 w-28 rounded bg-border/70" />
              </div>
              <PreviewFrame alt="밈플릿 프리뷰 로딩" loadingPlaceholder contentClassName="h-52 p-2" />
              <div className="mt-4 space-y-2">
                {Array.from({ length: 6 }, (_, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3">
                    <Skeleton className="h-4 w-16 rounded bg-border/70" />
                    <Skeleton className="h-4 w-28 rounded bg-border/70" />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl p-6">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-44 rounded bg-border/80" />
                  <Skeleton className="h-4 w-24 rounded bg-border/70" />
                </div>
                <Skeleton className="h-8 w-28 rounded bg-border/70" />
              </div>
              <div className="min-h-[280px]">
                <TemplateCardSkeletonGrid count={DETAIL_RELATED_SKELETON_COUNT} minItemWidth={240} />
              </div>
            </div>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTitle>상세 로딩 실패</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : template ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
            <div className="lg:self-start">
              <div className="rounded-2xl bg-card p-6">
                <div className="mb-4">
                  <h3 className="mb-1 text-2xl font-bold text-foreground">{template.title}</h3>
                  {template.description ? (
                    <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{template.description}</div>
                  ) : null}
                </div>
                <PreviewFrame
                  imageUrl={template.thumbnailUrl}
                  alt={template.title}
                  imageRef={mainImageRef}
                  imageKey={template.thumbnailUrl}
                  isImageLoaded={isMainImageLoaded}
                  isImageError={isMainImageError}
                  maxImageHeightClassName="max-h-[360px]"
                  onLoad={handleMainImageLoad}
                  onError={handleMainImageError}
                />
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">만든 사람</span>
                    <span className="text-right font-medium text-foreground">{template.ownerDisplayName || template.ownerId || '-'}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">생성일</span>
                    <span className="text-right font-medium text-foreground">{formatDateLabel(template.createdAt)}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">이미지 포맷</span>
                    <span className="text-right font-medium text-foreground">{imageMeta.format}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">해상도</span>
                    <span className="text-right font-medium text-foreground">{imageMeta.resolution}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">파일 사이즈</span>
                    <span className="text-right font-medium text-foreground">{imageMeta.fileSize}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">조회수</span>
                    <span className="text-right font-medium text-foreground">{(template.viewCount ?? 0).toLocaleString()}</span>
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className={`gap-1.5 ${likedTemplateByMe ? 'border-primary bg-primary/15 text-primary' : ''}`}
                    onClick={() => { void handleLikeTemplate(); }}
                    disabled={isLikingTemplate || template.visibility !== 'public'}
                    aria-label="좋아요"
                    aria-pressed={likedTemplateByMe}
                  >
                    <Icon path={mdiThumbUpOutline} size={0.75} />
                    {(template.likeCount ?? 0).toLocaleString()}
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
                          onClick={() => { void handleDownloadTemplateImage(); }}
                        >
                          <Icon path={mdiDownload} size={0.75} />
                          다운로드
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-9 justify-start gap-2"
                          onClick={() => { void handleCopyTemplateLink(); }}
                        >
                          <Icon path={mdiLinkVariant} size={0.75} />
                          링크 복사
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  {isOwner ? (
                    <Button type="button" variant="outline" onClick={handleOpenManageDialog}>
                      수정
                    </Button>
                  ) : null}
                </div>
                {isOwner ? (
                  <Dialog open={isManageDialogOpen} onOpenChange={handleManageDialogOpenChange}>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>밈플릿 관리</DialogTitle>
                        <DialogDescription>제목/설명 수정, 공개 상태 변경, 삭제를 관리합니다.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="template-title">제목</Label>
                          <Input
                            id="template-title"
                            value={editTitle}
                            maxLength={100}
                            disabled={isSavingMeta}
                            onChange={(event) => setEditTitle(event.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="template-description">설명</Label>
                          <Textarea
                            id="template-description"
                            value={editDescription}
                            maxLength={500}
                            rows={4}
                            disabled={isSavingMeta}
                            onChange={(event) => setEditDescription(event.target.value)}
                          />
                        </div>
                        {!isRelatedLoaded ? (
                          <div className="text-sm text-muted-foreground">관리 옵션을 확인하는 중입니다.</div>
                        ) : (
                          <>
                            {!isPrivateSwitchHidden ? (
                              <div className="space-y-2">
                                <div className="text-sm font-medium text-foreground">공개 상태</div>
                                <SegmentedButtons
                                  value={template.visibility}
                                  options={[
                                    { label: '비공개', value: 'private' },
                                    { label: '공개', value: 'public' },
                                  ]}
                                  disabled={isUpdatingVisibility}
                                  onChange={(value) => { void handleChangeVisibility(value); }}
                                />
                              </div>
                            ) : null}
                            {!isDeleteHidden ? (
                              <div className="space-y-2">
                                <div className="text-sm font-medium text-foreground">삭제</div>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  disabled={isDeletingTemplate}
                                  onClick={() => {
                                    setIsManageDialogOpen(false);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                >
                                  삭제
                                </Button>
                              </div>
                            ) : null}
                          </>
                        )}
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isUpdatingVisibility || isDeletingTemplate || isSavingMeta}
                          onClick={() => setIsManageDialogOpen(false)}
                        >
                          취소
                        </Button>
                        <Button
                          type="button"
                          disabled={isUpdatingVisibility || isDeletingTemplate || isSavingMeta}
                          onClick={() => { void handleSaveMetaFromDialog(); }}
                        >
                          {isSavingMeta ? '저장 중...' : '저장'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                ) : null}
                <div className="mt-5 flex flex-col gap-2">
                  <Button type="button" onClick={() => { void handleRemixClick(); }}>리믹스</Button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl p-6">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h4 className="mb-1 text-xl font-bold text-foreground">리믹스</h4>
                  <span className="text-sm text-muted-foreground">총 {relatedImages.length.toLocaleString()}개</span>
                </div>
                <div className="flex items-center rounded-xl bg-muted p-1">
                  <button
                    type="button"
                    onClick={() => setRelatedSort('latest')}
                    aria-pressed={relatedSort === 'latest'}
                    className={`h-8 rounded-lg px-3 text-xs font-bold ${relatedSort === 'latest' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                  >
                    최신
                  </button>
                  <button
                    type="button"
                    onClick={() => setRelatedSort('likes')}
                    aria-pressed={relatedSort === 'likes'}
                    className={`h-8 rounded-lg px-3 text-xs font-bold ${relatedSort === 'likes' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                  >
                    좋아요
                  </button>
                  <button
                    type="button"
                    onClick={() => setRelatedSort('views')}
                    aria-pressed={relatedSort === 'views'}
                    className={`h-8 rounded-lg px-3 text-xs font-bold ${relatedSort === 'views' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                  >
                    조회
                  </button>
                </div>
              </div>

              {isRelatedLoading ? (
                <div className="min-h-[280px]">
                  <TemplateCardSkeletonGrid count={DETAIL_RELATED_SKELETON_COUNT} minItemWidth={240} />
                </div>
              ) : relatedError ? (
                <Alert variant="destructive">
                  <AlertTitle>연관 이미지 로딩 실패</AlertTitle>
                  <AlertDescription>{relatedError}</AlertDescription>
                </Alert>
              ) : relatedImages.length === 0 ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-xl bg-transparent px-6 py-12 text-center text-muted-foreground">
                  <Icon path={mdiImageOffOutline} size={1.15} className="text-foreground/60" />
                  <div className="text-sm font-semibold text-foreground">아직 등록된 리믹스가 없습니다.</div>
                  <div className="text-xs text-muted-foreground">첫 리믹스를 만들어보세요.</div>
                </div>
              ) : (
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
                  {sortedRelatedImages.map((image) => (
                    <ThumbnailCard
                      key={image.id}
                      imageUrl={image.imageUrl}
                      title={image.title}
                      hoverable
                      hoverSurfaceOnly
                      onClick={() => openRelatedRemix(image.shareSlug)}
                    >
                      <div className="space-y-1">
                        <div className="line-clamp-1 text-sm font-semibold text-foreground">{image.title}</div>
                        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span className="truncate">{image.ownerDisplayName || '-'}</span>
                          <span className="inline-flex shrink-0 items-center gap-2">
                            <span className="inline-flex items-center gap-1">
                              <Icon path={mdiEyeOutline} size={0.55} />
                              {(image.viewCount ?? 0).toLocaleString()}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Icon path={mdiHeartOutline} size={0.55} />
                              {(image.likeCount ?? 0).toLocaleString()}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Icon path={mdiCommentOutline} size={0.55} />
                              {(image.commentCount ?? 0).toLocaleString()}
                            </span>
                          </span>
                        </div>
                      </div>
                    </ThumbnailCard>
                  ))}
                </div>
              )}
            </div>

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>밈플릿 삭제</DialogTitle>
                  <DialogDescription>
                    ‘{template.title}’을(를) 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDeleteDialogOpen(false)}
                    disabled={isDeletingTemplate}
                  >
                    취소
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={isDeletingTemplate}
                    onClick={() => { void handleDeleteTemplate(); }}
                  >
                    삭제
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ) : null}
      </PageContainer>
      <MainFooter />
    </div>
  );
};

export default TemplateShareDetailPage;
