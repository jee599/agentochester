import ComposePanel from "@/components/ComposePanel";

export default function Home() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-2">SpoonCompose</h1>
      <p className="text-sm text-gray-500 mb-6">
        프롬프트를 입력하면 태스크를 분해하고, 각 태스크에 최적의 에이전트를 매칭한다.
      </p>
      <ComposePanel />
    </div>
  );
}
