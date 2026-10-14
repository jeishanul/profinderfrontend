/**
 * For overlays most visitors never open (the login modal, the mobile "More" sheet, the confirm dialog): `true` from
 * the first time `needed()` is true, and from then on. Render the overlay as `<Lazy… v-if="mounted" />`. Its code and
 * CSS then stay out of the first page load and its closed markup out of every server render, and once mounted it
 * stays, so closing it still animates.
 */
export function useMountWhenNeeded(needed: () => boolean): Readonly<Ref<boolean>> {
  const mounted = shallowRef(false)

  watch(needed, (isNeeded) => {
    if (isNeeded) mounted.value = true
  }, { immediate: true })

  return readonly(mounted)
}
