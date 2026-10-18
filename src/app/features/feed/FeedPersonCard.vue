<script setup lang="ts">
// The feed's part of a person card (src/app/features/social/PersonApp.vue): their handle, bio and status, Follow when they opened their
// profile to followers, their work (gig reviews, finished gigs, friends' vouches, with Vouch for a friend), mutual friends and latest posts.
import '../../../ui/panels/social.css'
import './feed.css'
import { onMounted, ref, watch } from 'vue'
import { useApp } from '../../state/app.ts'
import PostCard from './PostCard.vue'
import { feedApi, portraitUrl } from './feedApi.ts'
import { SKILLS } from '../../../feed/model.ts'
import type { PostView, ProfileView } from '../../../types/feed.ts'

const props = defineProps<{ id: string }>()
const { game, shell } = useApp()
const api = feedApi((path, options) => game.fetchJson(path, options))
const profile = ref<ProfileView | null>(null), posts = ref<PostView[]>([]), skill = ref<string>(SKILLS[0]), now = ref(Date.now())
const toast = (t: string, tone?: 'error'): void => game.toast(t, tone === 'error' ? 'error' : 'info')
async function load(): Promise<void> {
  const r = await api.profile(props.id)
  profile.value = r.ok ? r.profile : null
  const p = await api.by(props.id); posts.value = p.ok ? p.posts.slice(0, 3) : []
}
onMounted(load)
watch(() => props.id, load)
async function follow(on: boolean): Promise<void> { const r = await api.follow(props.id, on); if (r.ok) profile.value = r.profile; else toast(r.reason, 'error') }
async function vouch(on: boolean, which = skill.value): Promise<void> { const r = await api.vouch(props.id, which, on); if (r.ok) { profile.value = r.profile; if (on) toast(`You vouched for their ${which.toLowerCase()}.`) } else toast(r.reason, 'error') }
</script>

<template>
  <section v-if="profile && !profile.mine && (profile.handle || profile.bio || profile.status || profile.portrait || profile.followable || posts.length || profile.work.rating || profile.work.vouches.length || profile.friend)" class="feed" data-feed="person" style="margin-top:12px">
    <div class="feed-card">
      <div class="feed-head">
        <img v-if="profile.portrait" class="feed-portrait is-big" :src="portraitUrl(profile.id, profile.portrait)" alt="">
        <div class="feed-who"><b v-if="profile.handle">@{{ profile.handle }}</b><small v-if="profile.followers">{{ profile.followers }}</small></div>
        <button v-if="profile.followable" type="button" class="social-btn" :class="{ 'is-primary': !profile.following }" @click="follow(!profile.following)">{{ profile.following ? 'Following' : 'Follow' }}</button>
      </div>
      <p v-if="profile.bio" class="feed-body">{{ profile.bio }}</p>
      <p v-if="profile.status" class="feed-note">{{ profile.status.text }}<template v-if="profile.status.place"> · {{ profile.status.place }}</template></p>
      <p v-if="profile.mutual?.length" class="feed-note">Mutual friends: {{ profile.mutual.map((m) => m.name).join(', ') }}</p>
      <div v-if="profile.crews.length" class="feed-row"><span v-for="c in profile.crews" :key="c.id" class="feed-crew-chip">{{ c.name }}</span></div>
    </div>
    <div v-if="profile.work.rating || profile.work.gigsDone || profile.work.vouches.length || profile.work.service || profile.friend" class="feed-card feed-form">
      <b>Work</b>
      <p v-if="profile.work.service" class="feed-note">Offers: {{ profile.work.service.title }} — {{ profile.work.service.about }}</p>
      <p v-if="profile.work.rating" class="feed-note">Gigs: {{ profile.work.rating }} · {{ profile.work.gigsDone }} done</p>
      <div v-if="profile.work.vouches.length" class="feed-row"><button v-for="v in profile.work.vouches" :key="v.skill" type="button" class="feed-pill" :class="{ 'is-mine': v.mine }" :title="v.mine ? 'Take back your vouch' : ''" @click="v.mine && vouch(false, v.skill)">{{ v.skill }} · {{ v.count }}</button></div>
      <ul v-if="profile.work.reviews.length" class="feed-replies"><li v-for="r in profile.work.reviews" :key="r.at"><b>{{ '★'.repeat(r.stars) }}</b>{{ r.text }} <small class="feed-note">{{ r.by.name }}</small></li></ul>
      <div v-if="profile.friend" class="feed-row"><select v-model="skill" aria-label="Skill"><option v-for="s in SKILLS" :key="s" :value="s">{{ s }}</option></select><button type="button" class="feed-pill" @click="vouch(true)">Vouch</button></div>
    </div>
    <template v-if="posts.length">
      <b>Posts</b>
      <PostCard v-for="p in posts" :key="p.id" :post="p" :api="api" :now="now" @changed="(x) => (posts = posts.map((q) => (q.id === x.id ? x : q)))" @removed="(i) => (posts = posts.filter((q) => q.id !== i))" @person="(i, n) => shell.open('person', { player: i, name: n })" @toast="toast" />
    </template>
  </section>
</template>
